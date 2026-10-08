import legacyIds from "./legacyIds.json";

export function canonicalId(kind: string, id: string): string {
  const aliases: Record<string, string> = kind === "concert" ? legacyIds.concerts : kind === "festival" ? legacyIds.festivals : {};
  return Object.hasOwn(aliases, id) ? aliases[id] : id;
}

export function shortId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  while (id.length < 6) {
    for (const byte of crypto.getRandomValues(new Uint8Array(12))) {
      if (byte < 252) id += alphabet[byte % alphabet.length];
      if (id.length === 6) return id;
    }
  }
  return id;
}
