"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../actions";
import { parseHouseholdImportWorkbook, type HouseholdImportGroup } from "./household-import";

async function requireImportPermission(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { churchId: true, roles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) return null;
  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");
  return isAdmin ? user.churchId : null;
}

export type HouseholdImportPreviewMember = {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  alreadyExists: boolean;
};

export type HouseholdImportPreviewGroup = {
  name: string;
  address: string | null;
  phone: string | null;
  frequencyDays: number | null;
  nextVisitAt: string | null;
  existingHouseholdId: string | null;
  members: HouseholdImportPreviewMember[];
};

export type HouseholdImportPreviewState = {
  errors: { row: number; message: string }[];
  groups: HouseholdImportPreviewGroup[];
};

function memberKey(firstName: string, lastName: string) {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
}

export async function previewHouseholdImport(
  _prevState: HouseholdImportPreviewState,
  formData: FormData,
): Promise<HouseholdImportPreviewState> {
  const userId = await getSessionUserId();
  if (!userId) return { errors: [{ row: 0, message: "No autorizado" }], groups: [] };

  const churchId = await requireImportPermission(userId);
  if (!churchId) return { errors: [{ row: 0, message: "No tenés permisos para importar hogares" }], groups: [] };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: [{ row: 0, message: "Seleccioná un archivo .xlsx válido" }], groups: [] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = parseHouseholdImportWorkbook(buffer);
  } catch {
    return { errors: [{ row: 0, message: "No se pudo leer el archivo. Verificá que sea un .xlsx válido" }], groups: [] };
  }

  const names = parsed.groups.map((group) => group.name);
  const existing = names.length
    ? await prisma.scHousehold.findMany({
        where: {
          churchId,
          status: "ACTIVE",
          OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
        },
        select: {
          id: true,
          name: true,
          members: { where: { status: "ACTIVE" }, select: { firstName: true, lastName: true } },
        },
      })
    : [];

  const existingByName = new Map(existing.map((household) => [household.name.trim().toLowerCase(), household]));

  const groups: HouseholdImportPreviewGroup[] = parsed.groups.map((group) => {
    const match = existingByName.get(group.name.trim().toLowerCase());
    const existingMemberKeys = new Set((match?.members ?? []).map((m) => memberKey(m.firstName, m.lastName)));

    return {
      name: group.name,
      address: group.address,
      phone: group.phone,
      frequencyDays: group.frequencyDays,
      nextVisitAt: group.nextVisitAt ? group.nextVisitAt.toISOString() : null,
      existingHouseholdId: match?.id ?? null,
      members: group.members.map((member) => ({
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate ? member.birthDate.toISOString() : null,
        phone: member.phone,
        alreadyExists: existingMemberKeys.has(memberKey(member.firstName, member.lastName)),
      })),
    };
  });

  return { errors: parsed.errors, groups };
}

function reviveGroups(groups: HouseholdImportPreviewGroup[]): HouseholdImportGroup[] {
  // Defense in depth: re-validate everything the client sent back, since the hidden
  // field round-trips through the browser before confirmHouseholdImport reads it.
  return groups
    .filter((group) => typeof group.name === "string" && group.name.trim().length > 0)
    .map((group) => ({
      name: group.name.trim(),
      address: group.address ?? null,
      phone: group.phone ?? null,
      frequencyDays:
        typeof group.frequencyDays === "number" && Number.isInteger(group.frequencyDays) && group.frequencyDays >= 1
          ? group.frequencyDays
          : null,
      nextVisitAt: group.nextVisitAt ? new Date(group.nextVisitAt) : null,
      members: group.members
        .filter((member) => member.firstName?.trim() && member.lastName?.trim())
        .map((member) => ({
          firstName: member.firstName.trim(),
          lastName: member.lastName.trim(),
          birthDate: member.birthDate ? new Date(member.birthDate) : null,
          phone: member.phone ?? null,
        })),
    }));
}

export type HouseholdImportConfirmState = {
  error?: string;
};

export async function confirmHouseholdImport(
  _prevState: HouseholdImportConfirmState,
  formData: FormData,
): Promise<HouseholdImportConfirmState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const churchId = await requireImportPermission(userId);
  if (!churchId) return { error: "No tenés permisos para importar hogares" };

  const raw = String(formData.get("groups") ?? "");
  let parsedGroups: HouseholdImportPreviewGroup[];
  try {
    parsedGroups = JSON.parse(raw);
  } catch {
    return { error: "No se pudo procesar la previsualización. Volvé a subir el archivo." };
  }

  const groups = reviveGroups(parsedGroups);
  if (groups.length === 0) return { error: "No hay hogares válidos para importar" };

  const existing = await prisma.scHousehold.findMany({
    where: {
      churchId,
      status: "ACTIVE",
      OR: groups.map((group) => ({ name: { equals: group.name, mode: "insensitive" as const } })),
    },
    select: {
      id: true,
      name: true,
      members: { where: { status: "ACTIVE" }, select: { firstName: true, lastName: true } },
    },
  });
  const existingByName = new Map(existing.map((household) => [household.name.trim().toLowerCase(), household]));

  let createdHouseholds = 0;
  let createdMembers = 0;

  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const match = existingByName.get(group.name.toLowerCase());

      if (match) {
        const existingMemberKeys = new Set(match.members.map((m) => memberKey(m.firstName, m.lastName)));
        const newMembers = group.members.filter((member) => !existingMemberKeys.has(memberKey(member.firstName, member.lastName)));
        if (newMembers.length === 0) continue;

        await tx.householdMember.createMany({
          data: newMembers.map((member) => ({ householdId: match.id, ...member })),
        });
        createdMembers += newMembers.length;
        continue;
      }

      if (group.members.length === 0) continue;

      await tx.scHousehold.create({
        data: {
          name: group.name,
          address: group.address,
          phone: group.phone,
          frequencyDays: group.frequencyDays,
          nextVisitAt: group.nextVisitAt,
          church: { connect: { id: churchId } },
          createdBy: { connect: { id: userId } },
          members: { create: group.members },
        },
      });
      createdHouseholds += 1;
      createdMembers += group.members.length;
    }

    await tx.auditLog.create({
      data: {
        churchId,
        userId,
        action: "IMPORT",
        entity: "ScHousehold",
        metadata: { createdHouseholds, createdMembers },
      },
    });
  }, { timeout: 60_000 });

  redirect("/dashboard/households");
}
