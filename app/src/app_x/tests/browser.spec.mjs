import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { seed, put } from "./seed.mjs";
const firestore = "http://127.0.0.1:8080/v1/projects/demo-rockshow420/databases/(default)/documents";
const authURL = "http://127.0.0.1:9099/emulator/v1/projects/demo-rockshow420/accounts";

async function login(page, email, admin = false) {
  await page.goto("/");
  const pop = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await pop;
  await popup.waitForLoadState();
  await popup.getByRole("button", { name: "Add new account" }).click();
  await popup.locator("#email-input").fill(email);
  await popup.locator("#display-name-input").fill(email.split("@")[0]);
  await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  if (!email.endsWith("@gmail.com")) return "";
  await expect(page).toHaveURL(new RegExp("/user/" + email.split("@")[0] + "$"));
  const accounts = await (
    await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-rockshow420/accounts:batchGet",
      { headers: { Authorization: "Bearer owner" } },
    )
  ).json();
  const uid = accounts.users.find((user) => user.email === email).localId;
  if (admin) await put(`admins/${uid}`, { enabled: true, email });
  await put(`users/${email.split("@")[0]}`, {
    user_id: uid,
    username: email.split("@")[0],
  });
  return uid;
}
async function doc(path) {
  const [name, id] = path.split("/");
  const table = ["venues", "artists", "concerts", "schedules", "users", "user_concerts"].includes(name);
  const response = await fetch(`${firestore}/${table ? `tables/${name}` : path}`, { headers: { Authorization: "Bearer owner" } });
  if (!response.ok) return null;
  const data = await response.json();
  if (!table) return data;
  const entries = data.fields.records.mapValue.fields || {};
  return id ? entries[id] ? { fields: entries[id].mapValue.fields } : null
    : { documents: Object.values(entries).map(entry => ({ fields: entry.mapValue.fields })) };
}

test.beforeEach(async () => {
  await fetch("http://127.0.0.1:8080/emulator/v1/projects/demo-rockshow420/databases/(default)/documents", {
    method: "DELETE",
    headers: { Authorization: "Bearer owner" },
  });
  await fetch(authURL, { method: "DELETE" });
  await seed();
  await mkdir("/Users/danielcepeda/repos/_codex_output/rockshow420/browser-checks", { recursive: true });
});

test("public pages: complete logs, detail-only notes, stale slugs and mobile layout", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/user/dcep93");
  await expect(page.getByRole("heading", { name: "@dcep93", exact: true })).toBeVisible();
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await expect(page.getByRole("region", { name: "Upcoming concerts", exact: true }).locator(".rs-concert-row").first()).toContainText("Radiohead");
  await expect(page.getByText("Public note from Alice.")).toHaveCount(0);
  await expect(page.getByText("Taking the train out. Cannot wait.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /upcoming|past|browse/i })).toHaveCount(0);
  await page.screenshot({ path: "/Users/danielcepeda/repos/_codex_output/rockshow420/browser-checks/user-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Radiohead", exact: true }).click();
  await expect(page.getByText("Public note from Alice.")).toBeVisible();
  await expect(page.getByText("Taking the train out. Cannot wait.")).toBeVisible();
  await page.goto("/concert/c1/old-name");
  await expect(page.getByRole("heading", { name: "Radiohead", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/Users/danielcepeda/repos/_codex_output/rockshow420/browser-checks/concert-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const [url, heading] of [
    ["/venue/foresthills/old-name", "Forest Hills Stadium"],
    ["/artist/slowdive/old-name", "Slowdive"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/user/dcep93");
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await page.screenshot({ path: "/Users/danielcepeda/repos/_codex_output/rockshow420/browser-checks/user-mobile.png", fullPage: true });
  await page.goto("/concert/missing/none");
  await expect(page.getByRole("heading", { name: "Concert not found" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the hidden toggle shows only hidden concerts, edited inline on their concert page", async ({ page }) => {
  const uid = await login(page, "bob@gmail.com");
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Edit|Add concert/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Show 0 hidden" })).not.toBeChecked();
  expect(await doc(`user_concerts/${uid}_c1`)).toBeNull();
  await page.getByRole("link", { name: "Radiohead", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Slowdive", { exact: true }).check();
  await page.getByLabel("Public Notes", { exact: true }).fill("Keep this note");
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unhide", exact: true })).toBeVisible();
  await expect.poll(async () => (await doc(`user_concerts/${uid}_c1`))?.fields.notes.stringValue).toBe("Keep this note");
  expect((await doc(`user_concerts/${uid}_c1`)).fields.removed.booleanValue).toBe(true);
  await page.getByRole("link", { name: "rockshow420", exact: true }).click();
  await expect(page.locator(".rs-concert-row")).toHaveCount(3);
  const hidden = page.getByRole("checkbox", { name: "Show 1 hidden" });
  await expect(hidden).not.toBeChecked();
  await hidden.check();
  await expect(page.locator(".rs-concert-row")).toHaveCount(1);
  const radiohead = page.locator(".rs-concert-row").filter({ hasText: "Radiohead" });
  await expect(radiohead).toHaveClass(/rs-concert-hidden/);
  await expect(radiohead).toContainText("Hidden");
  await hidden.uncheck();
  await expect(page.locator(".rs-concert-row")).toHaveCount(3);
  await expect(radiohead).toHaveCount(0);
  await hidden.check();
  await expect(page.locator(".rs-concert-row")).toHaveCount(1);
  await page.reload();
  await expect(hidden).not.toBeChecked();
  await expect(radiohead).toHaveCount(0);
  await hidden.check();
  await radiohead.getByRole("link", { name: "Radiohead", exact: true }).click();
  await expect(page.getByLabel("Public Notes", { exact: true })).toHaveValue("Keep this note");
  await expect(page.getByLabel("Slowdive", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Unhide", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide", exact: true })).toBeVisible();
  expect((await doc(`user_concerts/${uid}_c1`)).fields.removed.booleanValue).toBe(false);
  await page.goto("/user/alice");
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
});

test("admin creates records, repairs references and preserves exact timestamps and future fields", async ({
  page,
}) => {
  await login(page, "dcep93@gmail.com", true);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await expect(page.getByRole("button", { name: "admin: Manage", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "@dcep93", exact: true }).press("Escape");
  await put("concerts/exact", {
    date: new Date("2026-10-07T20:30:45.123Z"),
    venue_id: "bowery",
    artist_id: "radiohead",
    future_field: "keep me",
    supporting_artist_ids: ["gone"],
  });
  await page.goto("/concert/exact/old");
  await expect(page.getByRole("button", { name: /admin: Edit/ })).toHaveCount(0);
  await page.goto("/admin/manage");
  await page.getByRole("button", { name: "Radiohead at Bowery Ballroom Edit", exact: true }).click();
  await page.getByLabel(/Unavailable artist/).click();
  await page
    .getByLabel("Setlist.fm URL optional", { exact: true })
    .fill("https://www.setlist.fm/setlist/example");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("region", { name: "Edit concert", exact: true })).toHaveCount(0);
  const record = await doc("concerts/exact");
  expect(record.fields.date.timestampValue).toBe("2026-10-07T20:30:45.123Z");
  expect(record.fields.future_field.stringValue).toBe("keep me");
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "admin: Manage", exact: true }).click();
  await page.getByRole("button", { name: "Artists", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("New artist");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "admin: Manage", exact: true }).click();
  await page.getByRole("button", { name: "Venues", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test Hall");
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "admin: Manage", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/manage$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Concerts", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("combobox", { name: "Headliner", exact: true }).selectOption({ label: "New artist" });
  await page.getByRole("combobox", { name: "Venue", exact: true }).selectOption({ label: "Test Hall" });
  await page.getByLabel("Date and time", { exact: true }).fill("2026-03-08T02:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("daylight-saving gap");
  await page.getByLabel("Date and time", { exact: true }).fill("2026-11-01T01:30");
  await page
    .getByRole("combobox", { name: "This time occurs twice", exact: true })
    .selectOption({ index: 2 });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(async () => (await doc("concerts")).documents.some((item) => item.fields.date.timestampValue === "2026-11-01T06:30:00Z")).toBe(true);
  await page.goto("/concert/c1/radiohead");
  const alice = page.getByRole("article", { name: "@alice entry" });
  await expect(alice.getByRole("button", { name: /admin: Edit/ })).toHaveCount(0);
  await expect(alice.getByLabel("Public Notes")).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Concert entry" })).toHaveCount(1);
});

test("non-Gmail Google identity is rejected by the app", async ({ page }) => {
  await login(page, "person@example.com");
  await expect(page.getByRole("alert")).toContainText("verified Google Gmail account");
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await expect(page.getByRole("button", { name: "admin: Manage", exact: true })).toHaveCount(0);
});

test("saving defaults leaves no override and resetting inline edits deletes the override", async ({ page }) => {
  const uid = await login(page, "defaults@gmail.com");
  await page.getByRole("link", { name: "Radiohead", exact: true }).click();
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  await expect(page.getByLabel("Public Notes", { exact: true })).toBeVisible();
  await expect(page.getByText("Notes are public.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(save).toBeDisabled();
  expect(await doc(`user_concerts/${uid}_c1`)).toBeNull();
  await page.getByLabel("Public Notes", { exact: true }).fill("Temporary note");
  await page.getByLabel("Slowdive", { exact: true }).check();
  await save.click();
  await expect.poll(async () => (await doc(`user_concerts/${uid}_c1`))?.fields.notes.stringValue).toBe("Temporary note");
  await expect(save).toBeDisabled();
  await page.getByLabel("Public Notes", { exact: true }).fill("");
  await page.getByLabel("Slowdive", { exact: true }).uncheck();
  await save.click();
  await expect.poll(() => doc(`user_concerts/${uid}_c1`)).toBeNull();
  await expect(save).toBeDisabled();
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unhide", exact: true })).toBeVisible();
  expect((await doc(`user_concerts/${uid}_c1`)).fields.removed.booleanValue).toBe(true);
  await page.getByRole("button", { name: "Unhide", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide", exact: true })).toBeVisible();
  await expect.poll(() => doc(`user_concerts/${uid}_c1`)).toBeNull();
});

test("festival sets default unseen, repeated artists stay independent, and resetting deletes the override", async ({ page }) => {
  const uid = await login(page, "bob@gmail.com");
  await put("concerts/yyea3y", { name: "Local festival test", date: new Date("2026-10-07T00:00:00Z"), date_precision: "day", end_date: "2026-10-08", venue_id: "bowery", supporting_artist_ids: ["radiohead", "slowdive"] });
  await put("schedules/yyea3y", { sets: {
    first1: { artist_id: "radiohead", start: "2026-10-07T20:00:00-04:00", stage: "Main" },
    second: { artist_id: "radiohead", start: "2026-10-08T20:00:00-04:00", stage: "Main" },
    third1: { artist_id: "slowdive" },
  } });
  await page.goto("/festival/jucc7j/stale-slug");
  await expect(page).toHaveURL(/\/concert\/yyea3y\/stale-slug$/);
  const entry = page.getByRole("form", { name: "Concert entry" });
  const choices = entry.getByRole("checkbox");
  await expect(choices).toHaveCount(3);
  for (const choice of await choices.all()) await expect(choice).not.toBeChecked();
  expect(await doc(`user_concerts/${uid}_yyea3y`)).toBeNull();
  await choices.nth(1).check();
  await entry.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(async () => (await doc(`user_concerts/${uid}_yyea3y`))?.fields.seen_set_ids.arrayValue.values).toEqual([{ stringValue: "second" }]);
  await page.reload();
  await expect(choices.nth(0)).not.toBeChecked();
  await expect(choices.nth(1)).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/Users/danielcepeda/repos/_codex_output/rockshow420/browser-checks/festival-mobile.png", fullPage: true });
  await choices.nth(1).uncheck();
  await entry.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => doc(`user_concerts/${uid}_yyea3y`)).toBeNull();
});

test("admin edits schedules inline in Manage without an object-page edit button", async ({ page }) => {
  await login(page, "dcep93@gmail.com", true);
  await page.goto("/admin/manage");
  await page.getByRole("button", { name: "Slowdive at Bowery Ballroom Edit", exact: true }).click();
  await page.locator(".rs-schedule-editor summary").click();
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  const row = page.locator(".rs-schedule-edit-row");
  await row.getByRole("combobox", { name: "Artist", exact: true }).selectOption("slowdive");
  await row.getByLabel("Start", { exact: true }).fill("2027-06-03T19:30");
  await row.getByLabel("Stage", { exact: true }).fill("Main");
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect.poll(async () => Object.values((await doc("schedules/c4"))?.fields.sets.mapValue.fields || {}).length).toBe(1);
  await page.goto("/concert/c4/slowdive");
  await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Slowdive.*7:30 PM.*Main/ })).not.toBeChecked();
  await expect(page.getByRole("button", { name: /admin: Edit/ })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
