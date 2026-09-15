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

test("parseHouseholdMemberInput accepts a valid member", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández" });

  const result = parseHouseholdMemberInput(formData);

  assert.deepEqual(result, {
    firstName: "Juan",
    lastName: "Fernández",
    birthDate: null,
    phone: null,
    tasks: [],
  });
});

test("parseHouseholdMemberInput trims names and parses an optional birth date", () => {
  const formData = buildFormData({
    firstName: "  Ana  ",
    lastName: "  Fernández ",
    birthDate: "1990-05-20",
    phone: "1122334455",
  });

  const result = parseHouseholdMemberInput(formData);

  assert.equal(result?.firstName, "Ana");
  assert.equal(result?.lastName, "Fernández");
  assert.equal(result?.phone, "1122334455");
  assert.equal(result?.birthDate?.toISOString(), new Date("1990-05-20T00:00:00-03:00").toISOString());
});

test("parseHouseholdMemberInput accepts one or several valid tasks", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández" });
  formData.append("tasks", "CORO");
  formData.append("tasks", "ARREGLO_FLORAL");

  const result = parseHouseholdMemberInput(formData);

  assert.deepEqual(result?.tasks, ["CORO", "ARREGLO_FLORAL"]);
});

test("parseHouseholdMemberInput deduplicates repeated tasks and ignores unknown values", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández" });
  formData.append("tasks", "LIMPIEZA");
  formData.append("tasks", "LIMPIEZA");
  formData.append("tasks", "COCINA");

  const result = parseHouseholdMemberInput(formData);

  assert.deepEqual(result?.tasks, ["LIMPIEZA"]);
});

test("parseHouseholdMemberInput rejects a missing first or last name", () => {
  assert.equal(parseHouseholdMemberInput(buildFormData({ lastName: "Fernández" })), null);
  assert.equal(parseHouseholdMemberInput(buildFormData({ firstName: "Juan" })), null);
});

test("parseHouseholdMemberInput rejects an invalid birth date", () => {
  const formData = buildFormData({ firstName: "Juan", lastName: "Fernández", birthDate: "not-a-date" });

  assert.equal(parseHouseholdMemberInput(formData), null);
});
