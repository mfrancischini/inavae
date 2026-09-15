import assert from "node:assert/strict";
import test from "node:test";

import { householdImportColumns, parseHouseholdImportRows } from "../src/app/dashboard/household-import";

function row(overrides: Record<string, string | number> = {}) {
  return {
    [householdImportColumns.household]: "",
    [householdImportColumns.address]: "",
    [householdImportColumns.phone]: "",
    [householdImportColumns.frequencyDays]: "",
    [householdImportColumns.nextVisitAt]: "",
    [householdImportColumns.firstName]: "",
    [householdImportColumns.lastName]: "",
    [householdImportColumns.birthDate]: "",
    [householdImportColumns.memberPhone]: "",
    ...overrides,
  };
}

test("parseHouseholdImportRows groups rows with the same household name", () => {
  const rows = [
    row({
      [householdImportColumns.household]: "Familia González",
      [householdImportColumns.address]: "Calle Falsa 123",
      [householdImportColumns.firstName]: "Juan",
      [householdImportColumns.lastName]: "González",
    }),
    row({
      [householdImportColumns.household]: "Familia González",
      [householdImportColumns.firstName]: "Ana",
      [householdImportColumns.lastName]: "González",
    }),
  ];

  const result = parseHouseholdImportRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].name, "Familia González");
  assert.equal(result.groups[0].address, "Calle Falsa 123");
  assert.equal(result.groups[0].members.length, 2);
  assert.deepEqual(result.groups[0].members.map((m) => m.firstName), ["Juan", "Ana"]);
});

test("parseHouseholdImportRows rejects a row without household name", () => {
  const result = parseHouseholdImportRows([
    row({ [householdImportColumns.firstName]: "Luis", [householdImportColumns.lastName]: "Pérez" }),
  ]);

  assert.equal(result.groups.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /hogar/i);
});

test("parseHouseholdImportRows rejects a row missing first or last name", () => {
  const result = parseHouseholdImportRows([
    row({ [householdImportColumns.household]: "Familia Pérez", [householdImportColumns.firstName]: "Luis" }),
  ]);

  assert.equal(result.groups[0].members.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /nombre o apellido/i);
});

test("parseHouseholdImportRows rejects an invalid birth date", () => {
  const result = parseHouseholdImportRows([
    row({
      [householdImportColumns.household]: "Familia Pérez",
      [householdImportColumns.firstName]: "Luis",
      [householdImportColumns.lastName]: "Pérez",
      [householdImportColumns.birthDate]: "31/12/1990",
    }),
  ]);

  assert.equal(result.groups[0].members.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /fecha de nacimiento/i);
});

test("parseHouseholdImportRows rejects an invalid frequencyDays for a new household", () => {
  const result = parseHouseholdImportRows([
    row({
      [householdImportColumns.household]: "Familia Pérez",
      [householdImportColumns.frequencyDays]: "0",
      [householdImportColumns.firstName]: "Luis",
      [householdImportColumns.lastName]: "Pérez",
    }),
  ]);

  assert.equal(result.groups[0].frequencyDays, null);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /periodicidad/i);
});

test("parseHouseholdImportRows deduplicates the same member repeated within the file", () => {
  const result = parseHouseholdImportRows([
    row({ [householdImportColumns.household]: "Familia Pérez", [householdImportColumns.firstName]: "Luis", [householdImportColumns.lastName]: "Pérez" }),
    row({ [householdImportColumns.household]: "Familia Pérez", [householdImportColumns.firstName]: "luis", [householdImportColumns.lastName]: "pérez" }),
  ]);

  assert.equal(result.groups[0].members.length, 1);
  assert.equal(result.errors.length, 0);
});

test("parseHouseholdImportRows ignores household-level columns on repeated rows", () => {
  const result = parseHouseholdImportRows([
    row({
      [householdImportColumns.household]: "Familia Pérez",
      [householdImportColumns.address]: "Dirección original",
      [householdImportColumns.firstName]: "Luis",
      [householdImportColumns.lastName]: "Pérez",
    }),
    row({
      [householdImportColumns.household]: "Familia Pérez",
      [householdImportColumns.address]: "Otra dirección",
      [householdImportColumns.firstName]: "Marta",
      [householdImportColumns.lastName]: "Pérez",
    }),
  ]);

  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].address, "Dirección original");
});
