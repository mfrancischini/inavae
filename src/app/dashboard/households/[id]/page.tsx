import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../actions";

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

export default async function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const { id } = await params;
  const [user, household] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, church: { select: { name: true } } },
    }),
    prisma.scHousehold.findUnique({
      where: { id },
      select: {
        id: true,
        churchId: true,
        name: true,
        address: true,
        phone: true,
        notes: true,
        frequencyDays: true,
        lastVisitAt: true,
        nextVisitAt: true,
        activities: {
          orderBy: { scheduledAt: "desc" },
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            notes: true,
            activityType: { select: { code: true, name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
            participants: {
              select: {
                user: { select: { firstName: true, lastName: true } },
                companion: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!user || !household || household.churchId !== user.churchId) redirect("/dashboard/households");

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header household-detail-header">
        <div>
          <p className="dashboard-kicker">{user.church.name} · Hogar SC</p>
          <h1>{household.name}</h1>
          <p className="dashboard-intro">Historial de visitas y personas que participaron.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="activity-cancel" href="/dashboard/households">Volver a hogares</Link>
          <Link className="dashboard-action" href={`/dashboard/households/${household.id}/edit`}>Modificar</Link>
        </div>
      </header>

      <section className="household-detail-summary" aria-label="Datos del hogar">
        <div><span>Dirección</span><strong>{household.address ?? "Sin dirección"}</strong></div>
        <div><span>Periodicidad</span><strong>Cada {household.frequencyDays} días</strong></div>
        <div><span>Última visita</span><strong>{household.lastVisitAt ? dateFormatter.format(household.lastVisitAt) : "Sin visitas"}</strong></div>
        <div><span>Próxima visita</span><strong>{household.nextVisitAt ? dateFormatter.format(household.nextVisitAt) : "Sin fecha"}</strong></div>
      </section>

      {household.notes && <p className="household-detail-note">{household.notes}</p>}

      <section className="dashboard-section household-history" aria-labelledby="history-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-kicker">Registro</p><h2 id="history-title">Historial de actividades</h2></div>
          <span className="household-history-count">{household.activities.length} visitas</span>
        </div>
        {household.activities.length === 0 ? <p className="dashboard-empty">Todavía no hay actividades para este hogar.</p> : household.activities.map((activity) => {
          const people = [
            `${activity.createdBy.firstName} ${activity.createdBy.lastName}`,
            ...activity.participants.map(({ user: participant, companion }) => {
              const person = participant ?? companion;
              return person ? `${person.firstName} ${person.lastName}` : "";
            }),
          ].filter((name, index, names) => name && names.indexOf(name) === index);

          return (
            <article className="history-row" key={activity.id}>
              <div className="history-date">
                <strong>{dateFormatter.format(activity.scheduledAt)}</strong>
                <span>{activity.activityType.code} · {activity.activityType.name}</span>
              </div>
              <div className="history-people">
                <span className="activity-column-label">Siervos</span>
                <p>{people.join(" y ")}</p>
              </div>
              <div className="history-note">
                <span className="activity-column-label">Notas</span>
                <p>{activity.notes ?? "Sin notas"}</p>
              </div>
              <span className={`activity-status activity-status-${activity.status.toLowerCase()}`}>
                {statusLabels[activity.status]}
              </span>
            </article>
          );
        })}
      </section>
    </main>
  );
}
