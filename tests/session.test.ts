import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionToken, validateSessionToken } from "../src/app/auth-session";

test("buildSessionToken and validateSessionToken accept a valid session", () => {
  const userId = "user-123";
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const token = buildSessionToken(userId, expiresAt, "test-secret");

  assert.equal(validateSessionToken(token, "test-secret", Math.floor(Date.now() / 1000) + 30), true);
});

test("validateSessionToken rejects an expired session", () => {
  const userId = "user-123";
  const expiresAt = Math.floor(Date.now() / 1000) - 5;
  const token = buildSessionToken(userId, expiresAt, "test-secret");

  assert.equal(validateSessionToken(token, "test-secret", Math.floor(Date.now() / 1000)), false);
});
