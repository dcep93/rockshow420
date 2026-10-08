import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase/firestore";
import { decode, encode } from "../scripts/firestoreRest";

test("migration REST values preserve nanoseconds and nested personal values", () => {
  const original = {
    date: new Timestamp(1791403200, 123456789),
    records: { "uid_concert": { notes: "Keep \"this\"\nexactly", supporting_artist_ids: ["band"], removed: false, ticket_status: "purchased" } },
    integer: 42,
    fraction: 1.25,
    absent: null,
    empty: [],
  };
  const encoded = encode(original);
  assert.equal(encoded.mapValue.fields.date.timestampValue, "2026-10-07T20:00:00.123456789Z");
  assert.deepEqual(decode(encoded), original);
});

test("migration refuses values it cannot preserve", () => {
  assert.throws(() => decode({ integerValue: "9007199254740993" }), /Unsafe integer/);
  assert.throws(() => decode({ referenceValue: "projects/example/databases/(default)/documents/private/x" }), /Unsupported Firestore/);
  assert.throws(() => encode(undefined), /Unsupported/);
  assert.throws(() => encode(Infinity), /Unsupported/);
});
