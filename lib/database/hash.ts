/** SHA-256 hexadécimal via Web Crypto (navigateur en contexte sécurisé, Node 20+). */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newId(): string {
  return globalThis.crypto.randomUUID();
}
