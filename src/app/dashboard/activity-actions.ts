"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../actions";

type ActivityState = {
  error?: string;
};

function getExternalCompanionNames(formData: FormData) {
  return String(formData.get("externalCompanions") ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const [firstName, ...lastNameParts] = name.split(/\s+/);
      return { firstName, lastName: lastNameParts.join(" ") || "Sin apellido" };
    });
}

async function getUserParticipantIds(formData: FormData, churchId: string) {
  const ids = formData.getAll("companionUserIds").map(String).filter(Boolean);
  if (!ids.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, churchId, status: "ACTIVE" },
    select: { id: true },
  });
  if (users.length !== new Set(ids).size) throw new Error("INVALID_COMPANION_USERS");
  return users.map(({ id }) => id);
}

async function saveParticipants(activityId: string, churchId: string, formData: FormData) {
  const userIds = await getUserParticipantIds(formData, churchId);
  const externalNames = getExternalCompanionNames(formData);

  await prisma.activityUser.deleteMany({ where: { activityId } });
  if (userIds.length) {
    await prisma.activityUser.createMany({
      data: userIds.map((userId) => ({ activityId, userId })),
      skipDuplicates: true,
    });
  }

  for (const external of externalNames) {
    const companion = await prisma.companion.create({ data: { churchId, ...external } });
    await prisma.activityUser.create({ data: { activityId, companionId: companion.id } });
  }
}

async function getActivityPermission(userId: string, activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      churchId: true,
      createdById: true,
      status: true,
      church: { select: { users: { where: { id: userId }, select: { id: true, roles: { select: { role: { select: { name: true } } } } } } } },
    },
  });

  const churchUser = activity?.church.users[0];
  const isAdmin = churchUser?.roles.some(({ role }) => role.name === "ADMIN") ?? false;
  const canManage = Boolean(churchUser && (activity.createdById === userId || isAdmin));

  return { activity, canManage };
}

export async function createActivity(_previousState: ActivityState, formData: FormData): Promise<ActivityState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const activityTypeId = String(formData.get("activityTypeId") ?? "");
  const scheduledAtValue = String(formData.get("scheduledAt") ?? "");
  const scHouseholdId = String(formData.get("scHouseholdId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const completed = formData.get("completed") === "on";

  if (!activityTypeId || !scheduledAtValue || !scHouseholdId) {
    return { error: "Elegí el tipo, la fecha y el hogar a visitar para continuar." };
  }

  const scheduledAt = new Date(`${scheduledAtValue}:00-03:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "La fecha ingresada no es válida." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true },
    });

    if (!user) redirect("/");

    const activityType = await prisma.activityType.findFirst({
      where: { id: activityTypeId, churchId: user.churchId, isActive: true },
      select: { id: true, code: true, requiresVisitedPerson: true },
    });

    if (!activityType) {
      return { error: "El tipo de actividad seleccionado no está disponible." };
    }

    const selectedHousehold = await prisma.scHousehold.findFirst({
      where: { id: scHouseholdId, churchId: user.churchId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!selectedHousehold) return { error: "El hogar seleccionado no está disponible." };

    const activity = await prisma.activity.create({
      data: {
        churchId: user.churchId,
        activityTypeId: activityType.id,
        scheduledAt,
        scHouseholdId: selectedHousehold.id,
        notes: notes || null,
        createdById: userId,
        status: completed ? "COMPLETED" : "SCHEDULED",
      },
    });
    await saveParticipants(activity.id, user.churchId, formData);

    if (completed && activityType.code === "SC") {
      const visitedAt = new Date();
      const householdSchedule = await prisma.scHousehold.findUnique({ where: { id: selectedHousehold.id }, select: { frequencyDays: true } });
      if (householdSchedule?.frequencyDays) {
        await prisma.scHousehold.update({
          where: { id: scHouseholdId },
          data: { lastVisitAt: visitedAt, nextVisitAt: new Date(visitedAt.getTime() + householdSchedule.frequencyDays * 86400000) },
        });
      }
    }
  } catch {
    return { error: "No se pudo guardar la actividad. Revisá la conexión e intentá nuevamente." };
  }

  redirect("/dashboard");
}

export async function updateActivity(_previousState: ActivityState, formData: FormData): Promise<ActivityState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const activityId = String(formData.get("activityId") ?? "");
  const activityTypeId = String(formData.get("activityTypeId") ?? "");
  const scheduledAtValue = String(formData.get("scheduledAt") ?? "");
  const scHouseholdId = String(formData.get("scHouseholdId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const completed = formData.get("completed") === "on";

  if (!activityId || !activityTypeId || !scheduledAtValue || !scHouseholdId) {
    return { error: "Completá el tipo, la fecha y el hogar a visitar para continuar." };
  }

  const scheduledAt = new Date(`${scheduledAtValue}:00-03:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "La fecha ingresada no es válida." };
  }

  try {
    const permission = await getActivityPermission(userId, activityId);
    if (!permission.activity || !permission.canManage || permission.activity.status !== "SCHEDULED") {
      return { error: "No tenés permiso para modificar esta actividad." };
    }

    const activityType = await prisma.activityType.findFirst({
      where: { id: activityTypeId, churchId: permission.activity.churchId, isActive: true },
      select: { id: true, code: true, requiresVisitedPerson: true },
    });
    if (!activityType) return { error: "El tipo de actividad seleccionado no está disponible." };
    const household = await prisma.scHousehold.findFirst({
      where: { id: scHouseholdId, churchId: permission.activity.churchId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!household) return { error: "El hogar seleccionado no está disponible." };
    await prisma.activity.update({
      where: { id: activityId },
      data: { activityTypeId, scheduledAt, scHouseholdId: household.id, notes: notes || null, status: completed ? "COMPLETED" : "SCHEDULED" },
    });
    await saveParticipants(activityId, permission.activity.churchId, formData);

    if (completed && activityType.code === "SC") {
      const visitedAt = new Date();
      const householdSchedule = await prisma.scHousehold.findUnique({ where: { id: household.id }, select: { frequencyDays: true } });
      if (householdSchedule?.frequencyDays) {
        await prisma.scHousehold.update({
          where: { id: household.id },
          data: { lastVisitAt: visitedAt, nextVisitAt: new Date(visitedAt.getTime() + householdSchedule.frequencyDays * 86400000) },
        });
      }
    }
  } catch {
    return { error: "No se pudo modificar la actividad. Intentá nuevamente." };
  }

  redirect("/dashboard");
}

export async function cancelActivity(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;

  const permission = await getActivityPermission(userId, activityId);
  if (!permission.activity || !permission.canManage || permission.activity.status !== "SCHEDULED") return;

  await prisma.activity.update({
    where: { id: activityId },
    data: { status: "CANCELLED" },
  });

  redirect("/dashboard");
}

export async function completeActivity(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;

  const permission = await getActivityPermission(userId, activityId);
  if (!permission.activity || !permission.canManage || permission.activity.status !== "SCHEDULED") return;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      activityType: { select: { code: true } },
      scHouseholdId: true,
    },
  });
  if (!activity) return;

  const visitedAt = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.activity.update({
      where: { id: activityId },
      data: { status: "COMPLETED" },
    });

    if (activity.activityType.code === "SC" && activity.scHouseholdId) {
      const household = await transaction.scHousehold.findUnique({
        where: { id: activity.scHouseholdId },
        select: { frequencyDays: true },
      });
      if (household?.frequencyDays) {
        await transaction.scHousehold.update({
          where: { id: activity.scHouseholdId },
          data: {
            lastVisitAt: visitedAt,
            nextVisitAt: new Date(visitedAt.getTime() + household.frequencyDays * 86400000),
          },
        });
      }
    }
  });

  redirect("/dashboard");
}
