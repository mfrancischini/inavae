"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../actions";
import { parseHouseholdMemberInput } from "./household-member-input";

async function getHouseholdManagePermission(userId: string, householdId: string) {
  const [household, user] = await Promise.all([
    prisma.scHousehold.findUnique({
      where: { id: householdId },
      select: { churchId: true, createdById: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, roles: { select: { role: { select: { name: true } } } } },
    }),
  ]);

  if (!household || !user || household.churchId !== user.churchId) return false;

  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");
  return household.createdById === userId || isAdmin;
}

export async function createHousehold(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const frequencyValue = String(formData.get("frequencyDays") ?? "").trim();
  const frequencyDays = frequencyValue ? Number(frequencyValue) : null;
  const nextVisitValue = String(formData.get("nextVisitAt") ?? "");

  if (!name || (frequencyDays !== null && (!Number.isInteger(frequencyDays) || frequencyDays < 1))) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { churchId: true } });
  if (!user) redirect("/");

  const nextVisitAt = nextVisitValue
    ? new Date(`${nextVisitValue}T12:00:00-03:00`)
    : frequencyDays !== null ? new Date(Date.now() + frequencyDays * 86400000) : null;

const household = await prisma.scHousehold.create({
  data: {
    name,
    address: address || null,
    phone: phone || null,
    notes: notes || null,
    frequencyDays: frequencyDays,
    nextVisitAt,

    church: {
      connect: {
        id: user.churchId,
      },
    },

    createdBy: {
      connect: {
        id: userId,
      },
    },
  },
});

  redirect(`/dashboard/households/${household.id}`);
}

export async function updateHousehold(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const householdId = String(formData.get("householdId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const frequencyValue = String(formData.get("frequencyDays") ?? "").trim();
  const frequencyDays = frequencyValue ? Number(frequencyValue) : null;
  const nextVisitValue = String(formData.get("nextVisitAt") ?? "");

  if (!householdId || !name || (frequencyDays !== null && (!Number.isInteger(frequencyDays) || frequencyDays < 1))) return;

  const household = await prisma.scHousehold.findUnique({
    where: { id: householdId },
    select: { churchId: true, createdById: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { churchId: true, roles: { select: { role: { select: { name: true } } } } },
  });
  if (!household || !user || household.churchId !== user.churchId) redirect("/dashboard/households");

  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");
  if (household.createdById !== userId && !isAdmin) redirect("/dashboard/households");

  const nextVisitAt = nextVisitValue
    ? new Date(`${nextVisitValue}T12:00:00-03:00`)
    : frequencyDays !== null ? new Date(Date.now() + frequencyDays * 86400000) : null;

  await prisma.scHousehold.update({
    where: { id: householdId },
    data: { name, address: address || null, phone: phone || null, notes: notes || null, frequencyDays, nextVisitAt },
  });

  redirect("/dashboard/households");
}

export async function addHouseholdMember(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) redirect("/dashboard/households");

  const canManage = await getHouseholdManagePermission(userId, householdId);
  if (!canManage) redirect(`/dashboard/households/${householdId}/members`);

  const input = parseHouseholdMemberInput(formData);
  if (!input) redirect(`/dashboard/households/${householdId}/members`);

  await prisma.householdMember.create({
    data: { householdId, ...input },
  });

  redirect(`/dashboard/households/${householdId}/members`);
}

export async function updateHouseholdMember(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const memberId = String(formData.get("memberId") ?? "");
  const householdId = String(formData.get("householdId") ?? "");
  if (!memberId || !householdId) redirect("/dashboard/households");

  const canManage = await getHouseholdManagePermission(userId, householdId);
  if (!canManage) redirect(`/dashboard/households/${householdId}/members`);

  const member = await prisma.householdMember.findUnique({
    where: { id: memberId },
    select: { householdId: true },
  });
  if (!member || member.householdId !== householdId) redirect(`/dashboard/households/${householdId}/members`);

  const input = parseHouseholdMemberInput(formData);
  if (!input) redirect(`/dashboard/households/${householdId}/members/${memberId}/edit`);

  await prisma.householdMember.update({
    where: { id: memberId },
    data: input,
  });

  redirect(`/dashboard/households/${householdId}/members`);
}

export async function deactivateHouseholdMember(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const memberId = String(formData.get("memberId") ?? "");
  const householdId = String(formData.get("householdId") ?? "");
  if (!memberId || !householdId) redirect("/dashboard/households");

  const canManage = await getHouseholdManagePermission(userId, householdId);
  if (!canManage) redirect(`/dashboard/households/${householdId}/members`);

  const member = await prisma.householdMember.findUnique({
    where: { id: memberId },
    select: { householdId: true },
  });
  if (!member || member.householdId !== householdId) redirect(`/dashboard/households/${householdId}/members`);

  await prisma.householdMember.update({
    where: { id: memberId },
    data: { status: "INACTIVE" },
  });

  redirect(`/dashboard/households/${householdId}/members`);
}
