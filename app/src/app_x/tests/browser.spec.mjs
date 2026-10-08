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
  const response = await fetch(`${firestore}/${path}`, { headers: { Authorization: "Bearer owner" } });
  return response.ok ? response.json() : null;
}

test.beforeEach(async () => {
  await fetch("http://127.0.0.1:8080/emulator/v1/projects/demo-rockshow420/databases/(default)/documents", {
    method: "DELETE",
    headers: { Authorization: "Bearer owner" },
  });
  await fetch(authURL, { method: "DELETE" });
  await seed();
  await mkdir("/tmp/rockshow420-checks", { recursive: true });
});

test("public pages: complete logs, detail-only notes, stale slugs and mobile layout", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/user/dcep93");
  await expect(page.getByRole("heading", { name: "@dcep93", exact: true })).toBeVisible();
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await expect(page.locator(".rs-concert-row").first()).toContainText("Slowdive");
  await expect(page.getByText("Public note from Alice.")).toHaveCount(0);
  await expect(page.getByText("Taking the train out. Cannot wait.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /upcoming|past|browse/i })).toHaveCount(0);
  await page.screenshot({ path: "/tmp/rockshow420-checks/user-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Radiohead", exact: true }).click();
  await expect(page.getByText("Public note from Alice.")).toBeVisible();
  await expect(page.getByText("Taking the train out. Cannot wait.")).toBeVisible();
  await page.goto("/concert/c1/old-name");
  await expect(page.getByRole("heading", { name: "Radiohead", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/rockshow420-checks/concert-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const [url, heading] of [
    ["/venue/foresthills/old-name", "Forest Hills Stadium"],
    ["/artist/slowdive/old-name", "Slowdive"],
    ["/festival/f1/old-name", "A Weekend Outside"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/user/dcep93");
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  await page.screenshot({ path: "/tmp/rockshow420-checks/user-mobile.png", fullPage: true });
  await page.goto("/concert/missing/none");
  await expect(page.getByRole("heading", { name: "Concert not found" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("hidden concerts are revealed in the log and edited inline on their concert page", async ({ page }) => {
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
  await expect(page.locator(".rs-concert-row")).toHaveCount(4);
  const radiohead = page.locator(".rs-concert-row").filter({ hasText: "Radiohead" });
  await expect(radiohead).toHaveClass(/rs-concert-hidden/);
  await expect(radiohead).toContainText("Hidden");
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
  await expect(page.getByRole("button", { name: "Manage", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "@dcep93", exact: true }).press("Escape");
  await put("concerts/exact", {
    date: new Date("2026-10-07T20:30:45.123Z"),
    venue_id: "bowery",
    artist_id: "radiohead",
    future_field: "keep me",
    supporting_artist_ids: ["gone"],
  });
  await page.goto("/concert/exact/old");
  await page.getByRole("button", { name: "Edit concert", exact: true }).click();
  await page.getByLabel(/Unavailable artist/).click();
  await page
    .getByLabel("Setlist.fm URL optional", { exact: true })
    .fill("https://www.setlist.fm/setlist/example");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("region", { name: "Edit concert", exact: true })).toHaveCount(0);
  const record = await doc("concerts/exact");
  expect(record.fields.date.timestampValue).toBe("2026-10-07T20:30:45.123Z");
  expect(record.fields.future_field.stringValue).toBe("keep me");
  await put("festivals/repair", { name: "Repair me", concert_ids: ["gone-concert"] });
  await page.goto("/festival/repair/old");
  await page.getByRole("button", { name: "Edit festival", exact: true }).click();
  await page.getByLabel(/Unavailable concert/).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await page.getByRole("button", { name: "Artists", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("New artist");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await page.getByRole("button", { name: "Venues", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test Hall");
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "@dcep93", exact: true }).click();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
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
  const created = await doc("concerts");
  expect(created.documents.some((item) => item.fields.date.timestampValue === "2026-11-01T06:30:00Z")).toBe(
    true,
  );
  await page.goto("/concert/c1/radiohead");
  const alice = page.getByRole("article", { name: "@alice entry" });
  await alice.getByRole("button", { name: "Edit entry", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await alice.getByLabel("Public Notes", { exact: true }).fill("Edited by admin");
  await alice.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(async () => (await doc("user_concerts/alice-seed_c1"))?.fields.notes.stringValue).toBe("Edited by admin");
});

test("non-Gmail Google identity is rejected by the app", async ({ page }) => {
  await login(page, "person@example.com");
  await expect(page.getByRole("alert")).toContainText("verified Google Gmail account");
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await expect(page.getByRole("button", { name: "Manage", exact: true })).toHaveCount(0);
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
