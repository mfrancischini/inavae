import * as XLSX from "xlsx";

export const householdImportColumns = {
  household: "Hogar",
  address: "Dirección",
  phone: "Teléfono hogar",
  frequencyDays: "Periodicidad (días)",
  nextVisitAt: "Próxima visita",
  firstName: "Nombre integrante",
  lastName: "Apellido integrante",
  birthDate: "Fecha nac.",
  memberPhone: "Teléfono integrante",
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type HouseholdImportMember = {
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  phone: string | null;
};

export type HouseholdImportGroup = {
  name: string;
  address: string | null;
  phone: string | null;
  frequencyDays: number | null;
  nextVisitAt: Date | null;
  members: HouseholdImportMember[];
};

export type HouseholdImportRowError = {
  row: number;
  message: string;
};

export type HouseholdImportParseResult = {
  groups: HouseholdImportGroup[];
  errors: HouseholdImportRowError[];
};

function cell(row: Record<string, unknown>, key: string) {
  return String(row[key] ?? "").trim();
}

function parseIsoDate(value: string) {
  if (!value) return { ok: true as const, value: null };
  if (!isoDatePattern.test(value)) return { ok: false as const };
  const date = new Date(`${value}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return { ok: false as const };
  return { ok: true as const, value: date };
}

/**
 * Parses raw spreadsheet rows into household groups + per-row errors.
 * Household-level columns (dirección, teléfono, periodicidad, próxima visita) are only
 * read from the first row where a given household name appears; later rows for the
 * same household may leave those columns blank and they are ignored.
 */
export function parseHouseholdImportRows(rows: Record<string, unknown>[]): HouseholdImportParseResult {
  const errors: HouseholdImportRowError[] = [];
  const groupsByKey = new Map<string, HouseholdImportGroup>();
  const memberKeysByGroup = new Map<string, Set<string>>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const householdName = cell(row, householdImportColumns.household);
    if (!householdName) {
      errors.push({ row: rowNumber, message: "Falta el nombre del hogar" });
      return;
    }

    const groupKey = householdName.toLowerCase();
    let group = groupsByKey.get(groupKey);
    if (!group) {
      const frequencyValue = cell(row, householdImportColumns.frequencyDays);
      let frequencyDays: number | null = null;
      if (frequencyValue) {
        const parsed = Number(frequencyValue);
        if (!Number.isInteger(parsed) || parsed < 1) {
          errors.push({ row: rowNumber, message: `Periodicidad inválida para el hogar "${householdName}" (debe ser un entero mayor a 0)` });
        } else {
          frequencyDays = parsed;
        }
      }

      const nextVisitValue = cell(row, householdImportColumns.nextVisitAt);
      const nextVisitParsed = parseIsoDate(nextVisitValue);
      if (!nextVisitParsed.ok) {
        errors.push({ row: rowNumber, message: `Próxima visita inválida para el hogar "${householdName}" (usar formato AAAA-MM-DD)` });
      }

      group = {
        name: householdName,
        address: cell(row, householdImportColumns.address) || null,
        phone: cell(row, householdImportColumns.phone) || null,
        frequencyDays,
        nextVisitAt: nextVisitParsed.ok ? nextVisitParsed.value : null,
        members: [],
      };
      groupsByKey.set(groupKey, group);
      memberKeysByGroup.set(groupKey, new Set());
    }

    const firstName = cell(row, householdImportColumns.firstName);
    const lastName = cell(row, householdImportColumns.lastName);
    if (!firstName || !lastName) {
      errors.push({ row: rowNumber, message: "Falta el nombre o apellido del integrante" });
      return;
    }

    const birthDateValue = cell(row, householdImportColumns.birthDate);
    const birthDateParsed = parseIsoDate(birthDateValue);
    if (!birthDateParsed.ok) {
      errors.push({ row: rowNumber, message: `Fecha de nacimiento inválida para "${firstName} ${lastName}" (usar formato AAAA-MM-DD)` });
      return;
    }

    const memberKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
    const memberKeys = memberKeysByGroup.get(groupKey)!;
    if (memberKeys.has(memberKey)) return; // repeated in the file, skip silently
    memberKeys.add(memberKey);

    group.members.push({
      firstName,
      lastName,
      birthDate: birthDateParsed.value,
      phone: cell(row, householdImportColumns.memberPhone) || null,
    });
  });

  return { groups: [...groupsByKey.values()], errors };
}

export function parseHouseholdImportWorkbook(buffer: Buffer): HouseholdImportParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { groups: [], errors: [{ row: 0, message: "El archivo no tiene hojas" }] };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, dateNF: "yyyy-mm-dd", defval: "" });
  return parseHouseholdImportRows(rows);
}

export function buildHouseholdImportTemplate() {
  const sheet = XLSX.utils.json_to_sheet([
    {
      [householdImportColumns.household]: "Familia González",
      [householdImportColumns.address]: "Av. Siempre Viva 123",
      [householdImportColumns.phone]: "1122334455",
      [householdImportColumns.frequencyDays]: 30,
      [householdImportColumns.nextVisitAt]: "2026-10-01",
      [householdImportColumns.firstName]: "Juan",
      [householdImportColumns.lastName]: "González",
      [householdImportColumns.birthDate]: "1980-04-12",
      [householdImportColumns.memberPhone]: "1122334455",
    },
    {
      [householdImportColumns.household]: "Familia González",
      [householdImportColumns.address]: "",
      [householdImportColumns.phone]: "",
      [householdImportColumns.frequencyDays]: "",
      [householdImportColumns.nextVisitAt]: "",
      [householdImportColumns.firstName]: "Ana",
      [householdImportColumns.lastName]: "González",
      [householdImportColumns.birthDate]: "",
      [householdImportColumns.memberPhone]: "",
    },
  ]);
  sheet["!cols"] = Object.keys(householdImportColumns).map(() => ({ wch: 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Hogares");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
