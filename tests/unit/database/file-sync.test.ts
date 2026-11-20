import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSyncError, FileSyncService } from "@/lib/database/file-sync";
import type { Snapshot } from "@/lib/database/snapshot";
import { APP_ID } from "@/types/domain";

const snapshot = {
  app: APP_ID,
  schemaVersion: 1,
  exportedAt: "2026-11-20T14:00:00.000Z",
  tables: {},
  meta: {},
} as unknown as Snapshot;

const ok = (savedAt = "2026-11-20T14:00:02.000Z") =>
  new Response(JSON.stringify({ ok: true, savedAt }), { status: 200 });
const fail = (status: number, error: string, message: string) =>
  new Response(JSON.stringify({ error, message }), { status });

function setup(responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift() ?? ok();
    if (next instanceof Error) throw next;
    return next;
  });
  const exportSnapshot = vi.fn(async () => snapshot);
  const service = new FileSyncService({ exportSnapshot, fetchImpl: fetchImpl as typeof fetch });
  return { service, fetchImpl, exportSnapshot };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FileSyncService", () => {
  it("regroupe une rafale de modifications en un seul envoi après 2 s", async () => {
    const { service, fetchImpl } = setup([]);
    service.notifyChange();
    await vi.advanceTimersByTimeAsync(1000);
    service.notifyChange();
    service.notifyChange();
    expect(service.getState().status).toBe("pending");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await service.whenIdle();

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/storage/snapshot");
    expect(JSON.parse(init.body as string)).toEqual({ reason: "auto", snapshot });
    expect(service.getState()).toEqual({
      status: "saved",
      lastSavedAt: "2026-11-20T14:00:02.000Z",
    });
  });

  it("se désactive proprement quand la route est désactivée", async () => {
    const { service, fetchImpl } = setup([
      fail(403, "disabled", "Sauvegarde fichier désactivée (FILE_SYNC_ENABLED=false)."),
    ]);
    const states: string[] = [];
    service.subscribe((state) => states.push(state.status));
    await service.flush();
    expect(service.getState()).toMatchObject({
      status: "disabled",
      message: "Sauvegarde fichier désactivée (FILE_SYNC_ENABLED=false).",
    });
    expect(states).toEqual(["saving", "disabled"]);

    service.notifyChange();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("se désactive en environnement en lecture seule", async () => {
    const { service } = setup([fail(503, "read_only", "Environnement en lecture seule.")]);
    await service.flush();
    expect(service.getState().status).toBe("disabled");
  });

  it("tolère une coupure réseau brève, puis se désactive après 3 échecs consécutifs", async () => {
    const down = () => new TypeError("fetch failed");
    const { service } = setup([down(), ok(), down(), down(), down()]);
    await service.flush();
    expect(service.getState().status).toBe("error");
    await service.flush();
    expect(service.getState().status).toBe("saved");
    await service.flush();
    await service.flush();
    expect(service.getState().status).toBe("error");
    await service.flush();
    expect(service.getState().status).toBe("disabled");
  });

  it("relance un envoi si une modification arrive pendant l'écriture", async () => {
    let release!: (value: Response) => void;
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)))
      .mockImplementation(async () => ok());
    const service = new FileSyncService({
      exportSnapshot: async () => snapshot,
      fetchImpl: fetchImpl as typeof fetch,
    });

    const first = service.flush();
    await vi.advanceTimersByTimeAsync(0);
    void service.flush(); // arrive pendant l'envoi
    release(ok());
    await first;
    await service.whenIdle();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("pushSnapshot lève une erreur si le fichier n'a pas pu être écrit", async () => {
    const { service } = setup([fail(500, "write_failed", "Écriture impossible.")]);
    await expect(service.pushSnapshot(snapshot, "pre-replace")).rejects.toBeInstanceOf(
      FileSyncError,
    );
    await expect(service.pushSnapshot(snapshot, "pre-replace")).rejects.toThrow(
      "Écriture impossible.",
    );
  });
});
