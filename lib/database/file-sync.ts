/**
 * Synchro automatique IndexedDB → fichier local `data/hexagone-studio.json`.
 *
 * Après chaque écriture, un instantané complet est envoyé à `POST /api/storage/snapshot`
 * (debounce 2 s : une rafale de modifications produit un seul envoi).
 * Si la route refuse (désactivée, lecture seule, trop volumineux...), la synchro
 * s'arrête proprement et l'état l'indique. IndexedDB reste la source de vérité.
 */
import type { Snapshot } from "./snapshot";

export type FileSyncStatus = "idle" | "pending" | "saving" | "saved" | "error" | "disabled";
export type FileSyncReason = "auto" | "manual" | "pre-replace";

export interface FileSyncState {
  status: FileSyncStatus;
  /** Date de la dernière écriture réussie (ISO). */
  lastSavedAt?: string;
  /** Message lisible, en cas d'erreur ou de désactivation. */
  message?: string;
}

export interface FileSyncOptions {
  exportSnapshot: () => Promise<Snapshot>;
  endpoint?: string;
  debounceMs?: number;
  /** Échecs réseau consécutifs tolérés avant désactivation (serveur redémarré, coupure brève). */
  maxNetworkFailures?: number;
  fetchImpl?: typeof fetch;
}

export class FileSyncError extends Error {
  override name = "FileSyncError";
}

interface ErrorBody {
  error?: string;
  message?: string;
}

export class FileSyncService {
  private state: FileSyncState = { status: "idle" };
  private readonly listeners = new Set<(state: FileSyncState) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private dirty = false;
  private networkFailures = 0;

  private readonly endpoint: string;
  private readonly debounceMs: number;
  private readonly maxNetworkFailures: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: FileSyncOptions) {
    this.endpoint = options.endpoint ?? "/api/storage/snapshot";
    this.debounceMs = options.debounceMs ?? 2000;
    this.maxNetworkFailures = options.maxNetworkFailures ?? 3;
    this.fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  }

  getState(): FileSyncState {
    return this.state;
  }

  subscribe(listener: (state: FileSyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** À appeler après chaque écriture en base. */
  notifyChange(): void {
    if (this.state.status === "disabled") return;
    this.dirty = true;
    this.setState({ ...this.state, status: "pending" });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  /** Envoie immédiatement l'état courant (une seule écriture à la fois). */
  async flush(reason: FileSyncReason = "auto"): Promise<void> {
    if (this.state.status === "disabled") return;
    if (this.inFlight) {
      this.dirty = true;
      return this.inFlight;
    }
    this.dirty = false;
    this.inFlight = (async () => {
      try {
        await this.send(await this.options.exportSnapshot(), reason);
      } catch {
        // L'état porte déjà l'erreur ; une synchro automatique ne remonte pas d'exception.
      } finally {
        this.inFlight = null;
      }
      if (this.dirty && this.state.status !== "disabled" && !this.timer) {
        await this.flush("auto");
      }
    })();
    return this.inFlight;
  }

  /**
   * Sauvegarde explicite d'un instantané donné (ex. avant un remplacement).
   * Lève `FileSyncError` si le fichier n'a pas pu être écrit.
   */
  async pushSnapshot(snapshot: Snapshot, reason: FileSyncReason): Promise<void> {
    if (this.state.status === "disabled") {
      throw new FileSyncError(this.state.message ?? "Sauvegarde fichier désactivée.");
    }
    await this.send(snapshot, reason);
  }

  /** Résout quand aucun envoi n'est en cours (tests, fermeture propre). */
  async whenIdle(): Promise<void> {
    while (this.inFlight) await this.inFlight;
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private async send(snapshot: Snapshot, reason: FileSyncReason): Promise<void> {
    this.setState({ ...this.state, status: "saving" });

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, snapshot }),
      });
    } catch {
      this.networkFailures += 1;
      if (this.networkFailures >= this.maxNetworkFailures) {
        this.disable(
          "Serveur local injoignable : sauvegarde fichier désactivée pour cette session.",
        );
      } else {
        this.setState({ ...this.state, status: "error", message: "Serveur local injoignable." });
      }
      throw new FileSyncError(this.state.message);
    }

    this.networkFailures = 0;
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { savedAt?: string };
      this.setState({ status: "saved", lastSavedAt: body.savedAt ?? new Date().toISOString() });
      return;
    }

    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    this.disable(body.message ?? `La route de sauvegarde a répondu ${response.status}.`);
    throw new FileSyncError(this.state.message);
  }

  private disable(message: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.dirty = false;
    this.setState({ status: "disabled", lastSavedAt: this.state.lastSavedAt, message });
  }

  private setState(next: FileSyncState): void {
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }
}
