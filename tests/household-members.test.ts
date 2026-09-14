import assert from "node:assert/strict";
import test from "node:test";

import { parseHouseholdMemberInput } from "../src/app/dashboard/household-member-input";

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

test("parseHouseholdMemberInput accepts a valid member with default relationship", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández" });

  const result = parseHouseholdMemberInput(formData);

  assert.deepEqual(result, {
    firstName: "Juan",
    lastName: "Fernández",
    relationship: "OTRO",
    birthDate: null,
    phone: null,
  });
});

test("parseHouseholdMemberInput trims names and parses an optional birth date", () => {
  const formData = buildFormData({
    firstName: "  Ana  ",
    lastName: "  Fernández ",
    relationship: "MADRE",
    birthDate: "1990-05-20",
    phone: "1122334455",
  });

  const result = parseHouseholdMemberInput(formData);

  assert.equal(result?.firstName, "Ana");
  assert.equal(result?.lastName, "Fernández");
  assert.equal(result?.relationship, "MADRE");
  assert.equal(result?.phone, "1122334455");
  assert.equal(result?.birthDate?.toISOString(), new Date("1990-05-20T00:00:00-03:00").toISOString());
});

test("parseHouseholdMemberInput rejects a missing first or last name", () => {
  assert.equal(parseHouseholdMemberInput(buildFormData({ lastName: "Fernández" })), null);
  assert.equal(parseHouseholdMemberInput(buildFormData({ firstName: "Juan" })), null);
});

test("parseHouseholdMemberInput rejects an invalid relationship", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández", relationship: "ABUELO" });

  assert.equal(parseHouseholdMemberInput(formData), null);
});

test("parseHouseholdMemberInput rejects an invalid birth date", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández", birthDate: "not-a-date" });

  assert.equal(parseHouseholdMemberInput(formData), null);
});
