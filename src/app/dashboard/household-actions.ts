"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../actions";

export async function createHousehold(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const frequencyDays = Number(formData.get("frequencyDays"));
  const nextVisitValue = String(formData.get("nextVisitAt") ?? "");

  if (!name || !Number.isInteger(frequencyDays) || frequencyDays < 1) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { churchId: true } });
  if (!user) redirect("/");

  const nextVisitAt = nextVisitValue
    ? new Date(`${nextVisitValue}T12:00:00-03:00`)
    : new Date(Date.now() + frequencyDays * 86400000);

  await prisma.scHousehold.create({
    data: {
      churchId: user.churchId,
      createdById: userId,
      name,
      address: address || null,
      phone: phone || null,
      notes: notes || null,
      frequencyDays,
      nextVisitAt,
    },
  });

  redirect("/dashboard/households");
}

export async function updateHousehold(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const householdId = String(formData.get("householdId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const frequencyDays = Number(formData.get("frequencyDays"));
  const nextVisitValue = String(formData.get("nextVisitAt") ?? "");

  if (!householdId || !name || !Number.isInteger(frequencyDays) || frequencyDays < 1) return;

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
    : new Date(Date.now() + frequencyDays * 86400000);

  await prisma.scHousehold.update({
    where: { id: householdId },
    data: { name, address: address || null, phone: phone || null, notes: notes || null, frequencyDays, nextVisitAt },
  });

  redirect("/dashboard/households");
}
