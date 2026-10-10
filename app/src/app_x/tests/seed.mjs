// Local fixtures only. Fixed demo project and loopback host intentionally cannot target production.
const base = "http://127.0.0.1:8080/v1/projects/demo-concertboxd/databases/(default)/documents";
function value(input) {
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  if (typeof input === "boolean") return { booleanValue: input };
  if (input instanceof Date) return { timestampValue: input.toISOString() };
  if (input === null) return { nullValue: null };
  if (typeof input === "number") return { integerValue: String(input) };
  if (typeof input === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(input).map(([key, item]) => [key, value(item)])) } };
  return { stringValue: String(input) };
}
const tableNames = ["venues", "artists", "concerts", "schedules", "users", "user_concerts"];
const field = id => "records.`" + id.replaceAll("\\", "\\\\").replaceAll("`", "\\`") + "`";
export async function put(path, data) {
  const [name, id] = path.split("/");
  const table = tableNames.includes(name);
  const mask = table ? new URLSearchParams([["updateMask.fieldPaths", field(id)], ["updateMask.fieldPaths", "schema_version"]]) : "";
  const target = table ? `tables/${name}?${mask}` : path;
  const body = table ? { schema_version: 1, records: { [id]: data } } : data;
  const response = await fetch(`${base}/${target}`, {
    method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(body).map(([key, item]) => [key, value(item)])) }),
  });
  if (!response.ok) throw new Error(await response.text());
}
export async function remove(path) {
  const [name, id] = path.split("/");
  const table = tableNames.includes(name);
  const target = table ? `tables/${name}?${new URLSearchParams([["updateMask.fieldPaths", field(id)]])}` : path;
  const response = await fetch(`${base}/${target}`, {
    method: table ? "PATCH" : "DELETE", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    ...(table ? { body: JSON.stringify({ fields: {} }) } : {}),
  });
  if (!response.ok) throw new Error(await response.text());
}
export async function seed() {
  const response = await fetch(`${base}/tables/schedules`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: { schema_version: value(1), records: value({}) } }) });
  if (!response.ok) throw new Error(await response.text());
  const entries = {
    "artists/radiohead": { name: "Radiohead" },
    "artists/national": { name: "The National" },
    "artists/slowdive": { name: "Slowdive" },
    "artists/bigthief": { name: "Big Thief" },
    "venues/foresthills": {
      name: "Forest Hills Stadium",
      location: "Queens, New York",
      timezone: "America/New_York",
    },
    "venues/bowery": { name: "Bowery Ballroom", location: "New York, NY", timezone: "America/New_York" },
    "venues/redrocks": {
      name: "Red Rocks Amphitheatre",
      location: "Morrison, Colorado",
      timezone: "America/Denver",
    },
    "concerts/c1": {
      date: new Date("2027-05-22T23:30:00Z"),
      venue_id: "foresthills",
      artist_id: "radiohead",
      supporting_artist_ids: ["slowdive"],
      setlist_fm_url: "https://www.setlist.fm/",
    },
    "concerts/c2": {
      date: new Date("2026-09-12T00:00:00Z"),
      venue_id: "bowery",
      artist_id: "bigthief",
      supporting_artist_ids: [],
    },
    "concerts/c3": {
      date: new Date("2025-08-04T01:00:00Z"),
      venue_id: "redrocks",
      artist_id: "national",
      supporting_artist_ids: ["bigthief"],
    },
    "concerts/c4": {
      date: new Date("2027-06-03T23:00:00Z"),
      venue_id: "bowery",
      artist_id: "slowdive",
      supporting_artist_ids: [],
    },
    "users/dcep93": { user_id: "admin-seed", username: "dcep93" },
    "users/alice": { user_id: "alice-seed", username: "alice" },
    "user_concerts/admin-seed_c1": {
      user_id: "admin-seed",
      concert_id: "c1",
      supporting_artist_ids: ["slowdive"],
      notes: "Taking the train out. Cannot wait.",
    },
    "user_concerts/admin-seed_c2": {
      user_id: "admin-seed",
      concert_id: "c2",
      notes: "One of those nights you wish would never end.",
    },
    "user_concerts/admin-seed_c3": {
      user_id: "admin-seed",
      concert_id: "c3",
      supporting_artist_ids: ["bigthief"],
      notes: "That view. That encore.",
    },
    "user_concerts/alice-seed_c1": {
      user_id: "alice-seed",
      concert_id: "c1",
      notes: "Public note from Alice.",
    },
  };
  for (const [path, data] of Object.entries(entries)) await put(path, data);
}
if (process.argv[1]?.endsWith("/seed.mjs")) {
  await seed();
  console.log("Seeded local demo-concertboxd emulator only.");
}
