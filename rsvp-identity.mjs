// Keep the key stable across case, Unicode presentation and whitespace variants.
export function normalizeName(name) {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export async function createNameKey(name, subtle = globalThis.crypto.subtle) {
  const bytes = new TextEncoder().encode(
    `nisha-sajal-2027:name:v1:${normalizeName(name)}`,
  );
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
