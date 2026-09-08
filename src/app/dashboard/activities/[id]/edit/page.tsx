import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../../actions";
import { ActivityForm } from "../../../activity-form";

function formatDateTimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const { id } = await params;
  const [activity, user] = await Promise.all([
    prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        churchId: true,
        createdById: true,
        status: true,
        activityTypeId: true,
        scheduledAt: true,
        visitedPersonId: true,
        place: true,
        notes: true,
        scHouseholdId: true,
        participants: {
          select: {
            userId: true,
            companion: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
    }),
  ]);

  const canManage = Boolean(
    activity && user && activity.churchId === user.churchId &&
    (activity.createdById === userId || user.roles.some(({ role }) => role.name === "ADMIN"))
  );
  if (!activity || !user || !canManage || activity.status !== "SCHEDULED") redirect("/dashboard");

  const [activityTypes, people, users, households] = await Promise.all([
    prisma.activityType.findMany({
      where: { churchId: user.churchId, isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, requiresVisitedPerson: true },
    }),
    prisma.visitedPerson.findMany({
      where: { churchId: user.churchId, status: "ACTIVE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.user.findMany({
      where: { churchId: user.churchId, status: "ACTIVE", id: { not: userId } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.scHousehold.findMany({
      where: { churchId: user.churchId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
  ]);

  return (
    <main className="dashboard-shell">
      <section className="activity-editor">
        <p className="dashboard-kicker">{user.church.name} · Agenda</p>
        <h1>Modificar actividad</h1>
        <p className="dashboard-intro">Actualizá los datos de la actividad seleccionada.</p>
        <ActivityForm
          activityTypes={activityTypes}
          people={people.map((person) => ({ id: person.id, name: `${person.lastName}, ${person.firstName}` }))}
          users={users.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}` }))}
          households={households}
          activity={{
            id: activity.id,
            activityTypeId: activity.activityTypeId,
            scheduledAt: formatDateTimeLocal(activity.scheduledAt),
            scHouseholdId: activity.scHouseholdId ?? "",
            notes: activity.notes ?? "",
            companionUserIds: activity.participants.flatMap(({ userId }) => userId ? [userId] : []),
            externalCompanions: activity.participants
              .flatMap(({ companion }) => companion ? [`${companion.firstName} ${companion.lastName}`] : [])
              .join(", "),
          }}
        />
      </section>
    </main>
  );
}
