/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import { observeSession } from "../data/session";
import type { Session } from "../data/session";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const user = (uid = "admin", email = "dcep93@gmail.com") => ({
  uid, email, emailVerified: true,
  getIdTokenResult: async () => ({ signInProvider: "google.com" }),
});
function harness(ensureProfile = async () => {}) {
  let nextUser!: (value: ReturnType<typeof user> | null) => void;
  const roles: { next: (enabled: boolean) => void; error: () => void; stopped: boolean }[] = [];
  const states: Session[] = [];
  const errors: unknown[] = [];
  let signOuts = 0;
  const stop = observeSession({
    watchUser: (next) => { nextUser = next; return () => {}; },
    watchAdmin: (_uid, next, error) => {
      const listener = { next, error, stopped: false };
      roles.push(listener);
      return () => { listener.stopped = true; };
    },
    ensureProfile,
    signOut: async () => { signOuts++; nextUser(null); },
  }, (state) => states.push(state), (error) => errors.push(error));
  return { emit: (value: ReturnType<typeof user> | null) => nextUser(value), roles, states, errors, stop,
    get signOuts() { return signOuts; } };
}

test("initial account UI waits for token, profile and role to resolve together", async () => {
  const token = deferred<{ signInProvider: string }>();
  const profile = deferred<void>();
  const h = harness(() => profile.promise);
  h.emit({ ...user(), getIdTokenResult: () => token.promise });
  assert.ok(h.states.every((s) => !s.ready && !s.viewer));
  token.resolve({ signInProvider: "google.com" }); await tick();
  assert.equal(h.roles.length, 0);
  profile.resolve(); await tick();
  assert.ok(h.states.every((s) => !s.ready && !s.viewer));
  h.roles[0].next(true);
  assert.deepEqual(h.states.at(-1), { viewer: { uid: "admin", username: "dcep93" }, isAdmin: true, ready: true });
  h.stop();
});

test("token refresh never clears confirmed controls or restarts the role listener", async () => {
  const h = harness();
  h.emit(user()); await tick(); h.roles[0].next(true);
  const count = h.states.length;
  const token = deferred<{ signInProvider: string }>();
  h.emit({ ...user(), getIdTokenResult: () => token.promise });
  assert.equal(h.states.length, count);
  assert.equal(h.roles[0].stopped, false);
  token.resolve({ signInProvider: "google.com" }); await tick();
  assert.equal(h.states.length, count);
  assert.equal(h.roles.length, 1);
  h.roles[0].next(false);
  assert.equal(h.states.at(-1)?.viewer?.username, "dcep93");
  assert.equal(h.states.at(-1)?.isAdmin, false);
  h.stop();
});

test("late callbacks cannot restore an old account after switching or signing out", async () => {
  const h = harness();
  h.emit(user()); await tick(); h.roles[0].next(true);
  const oldRole = h.roles[0];
  const token = deferred<{ signInProvider: string }>();
  h.emit({ ...user("other", "alice@gmail.com"), getIdTokenResult: () => token.promise });
  assert.equal(h.states.at(-1)?.ready, false);
  assert.equal(oldRole.stopped, true);
  h.emit(null);
  const count = h.states.length;
  oldRole.next(true);
  token.resolve({ signInProvider: "google.com" }); await tick();
  assert.equal(h.states.length, count);
  assert.deepEqual(h.states.at(-1), { viewer: null, isAdmin: false, ready: true });
  h.stop();
});

test("profile failure does not misrepresent a verified user as signed out", async () => {
  const h = harness(async () => { throw new Error("Profile unavailable"); });
  h.emit(user("other", "alice@gmail.com")); await tick(); h.roles[0].error();
  assert.equal(h.errors.length, 1);
  assert.deepEqual(h.states.at(-1), { viewer: { uid: "other", username: "alice" }, isAdmin: false, ready: true });
  h.stop();
});

test("invalid Google identities never gain a visible signed-in session", async () => {
  for (const account of [
    { ...user(), emailVerified: false },
    user("other", "alice@example.com"),
    { ...user(), getIdTokenResult: async () => ({ signInProvider: "password" }) },
  ]) {
    const h = harness();
    h.emit(account); await tick();
    assert.equal(h.signOuts, 1);
    assert.equal(h.roles.length, 0);
    assert.ok(h.states.every((s) => s.viewer === null));
    h.stop();
  }
});
