import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, FileSpreadsheet, House } from "lucide-react";

import { getSessionUserId, signOut } from "../actions";
import { cancelActivity, completeActivity } from "./activity-actions";
import { MonthlyActivityCards } from "./monthly-activity-cards";
import { prisma } from "@/lib/prisma";
import { Flower2,  Sparkles,  Music2,} from "lucide-react";
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const statusLabels = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
} as const;

function getCurrentMonthBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    monthIndex: month,
    start: new Date(`${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00-03:00`),
    end: new Date(`${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}T23:59:59.999-03:00`),
  };
}

export default async function DashboardPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/");
  }

  const month = getCurrentMonthBounds();

  const [user, activities, monthlyVae, monthlySc, recentVae, monthlyScActivities, monthlyBirthdayMembers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        church: { select: { name: true } },
        roles: { select: { role: { select: { name: true } } } },
      },
    }),
    prisma.activity.findMany({
      where: {
        church: { users: { some: { id: userId } } },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      select: {
        id: true,
        createdById: true,
        scheduledAt: true,
        status: true,
        place: true,
        notes: true,
        scHousehold: { select: { name: true, address: true } },
        activityType: { select: { code: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        participants: {
          select: {
            user: { select: { firstName: true, lastName: true } },
            companion: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.activity.count({
      where: {
        church: { users: { some: { id: userId } } },
        scheduledAt: { gte: month.start, lte: month.end },
        activityType: { code: "VAE" },
      },
    }),
    prisma.activity.count({
      where: {
        church: { users: { some: { id: userId } } },
        scheduledAt: { gte: month.start, lte: month.end },
        activityType: { code: "SC" },
      },
    }),
    prisma.activity.findMany({
      where: {
        church: { users: { some: { id: userId } } },
        scheduledAt: { gte: month.start, lte: month.end },
        activityType: { code: "VAE" },
      },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        scHousehold: { select: { name: true } },
      },
    }),
    prisma.activity.findMany({
      where: {
        church: { users: { some: { id: userId } } },
        scheduledAt: { gte: month.start, lte: month.end },
        activityType: { code: "SC" },
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        scHousehold: { select: { name: true } },
      },
    }),
    prisma.householdMember.findMany({
      where: {
        status: "ACTIVE",
        birthDate: { not: null },
        household: { church: { users: { some: { id: userId } } }, status: "ACTIVE" },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        household: { select: { name: true } },
      },
    }),
  ]);

  if (!user) redirect("/");

  const monthlyBirthdays = monthlyBirthdayMembers
    .filter((member) => member.birthDate!.getUTCMonth() === month.monthIndex)
    .sort((a, b) => a.birthDate!.getUTCDate() - b.birthDate!.getUTCDate())
    .map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate!.toISOString(),
      householdName: member.household.name,
    }));

  const activityRows = activities.map((activity) => {
    const peopleGoing = [
      `${activity.createdBy.firstName} ${activity.createdBy.lastName}`,
      ...activity.participants.map(({ user: participant, companion }) => {
        const person = participant ?? companion;
        return person ? `${person.firstName} ${person.lastName}` : "";
      }),
    ].filter((name, index, names) => names.indexOf(name) === index);

    return { ...activity, peopleGoing };
  });

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{user.church.name}</p>
          <h1>Buen día, {user.firstName}.</h1>
          <p className="dashboard-intro">Acá tenés una mirada rápida de lo que viene.</p>
        </div>

        <form action={signOut}>
          <button className="dashboard-signout" type="submit">Cerrar sesión</button>
        </form>
      </header>

      <MonthlyActivityCards
        monthName={new Intl.DateTimeFormat("es-AR", { month: "long" }).format(month.start)}
        vaeCount={monthlyVae}
        scCount={monthlySc}
        vaeActivities={recentVae.map((activity) => ({ id: activity.id, scheduledAt: activity.scheduledAt.toISOString(), status: activity.status, householdName: activity.scHousehold?.name ?? "Hogar no definido" }))}
        scActivities={monthlyScActivities.map((activity) => ({ id: activity.id, scheduledAt: activity.scheduledAt.toISOString(), status: activity.status, householdName: activity.scHousehold?.name ?? "Hogar no definido" }))}
        birthdays={monthlyBirthdays}
      />

      <section className="dashboard-section" aria-labelledby="upcoming-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-kicker">Agenda</p>
            <h2 id="upcoming-title">Actividades pendientes</h2>
          </div>
          <div className="dashboard-actions">
            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/households"
              aria-label="Crear hogar"
              title="Crear hogar"
            >
              <House size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/households/due"
              aria-label="Ver Santa Cenas"
              title="Santa Cenas"
            >
              <CalendarClock size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/reports"
              aria-label="Exportar actividades a Excel"
              title="Exportar actividades a Excel"
            >
              <FileSpreadsheet size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/flower-arrangements"
              aria-label="Arreglos Florales"
              title="Arreglos Florales"
            >
              <Flower2 size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/cleaning"
              aria-label="Limpieza"
              title="Limpieza"
            >
              <Sparkles size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action dashboard-action-house"
              href="/dashboard/choir"
              aria-label="Coro"
              title="Coro"
            >
              <Music2 size={17} strokeWidth={2} aria-hidden="true" />
            </Link>

            <Link
              className="dashboard-action"
              href="/dashboard/activities/new"
            >
              + Nueva actividad
            </Link>
          </div>
        </div>

        <div className="activity-list">
          {activities.length === 0 ? (
            <p className="dashboard-empty">Todavía no hay actividades cargadas.</p>
          ) : activityRows.map((activity) => (
            <article className="activity-row" key={activity.id}>
              <div className="activity-date">
                <strong>{activity.activityType.code}</strong>
                <span>{dateFormatter.format(activity.scheduledAt)}</span>
              </div>
              <div className="activity-detail">
                <h3>{activity.activityType.name}</h3>
                <p><strong>Siervos:</strong> {activity.peopleGoing.join(" y ")}</p>
              </div>
              <div className="activity-home">
                <span className="activity-column-label">Hogar a visitar</span>
                <p>{activity.scHousehold?.name ?? activity.place ?? "Sin hogar definido"}</p>
              </div>
              <div className="activity-notes">
                <span className="activity-column-label">Descripción / nota</span>
                <p>{activity.notes ?? "Sin descripción"}</p>
              </div>
              <div className="activity-meta">
                <span className={`activity-status activity-status-${activity.status.toLowerCase()}`}>
                  {statusLabels[activity.status]}
                </span>
                {(activity.createdById === userId || user.roles.some(({ role }) => role.name === "ADMIN")) && (
                  <div className="activity-actions">
                    <Link href={`/dashboard/activities/${activity.id}/edit`}>Modificar</Link>
                    {activity.activityType.code === "SC" && (
                      <form action={completeActivity}>
                        <input type="hidden" name="activityId" value={activity.id} />
                        <button type="submit" style={{ color: "#4a9165" }}>Completado</button>
                      </form>
                    )}
                    <form action={cancelActivity}>
                      <input type="hidden" name="activityId" value={activity.id} />
                      <button type="submit">Cancelar</button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}