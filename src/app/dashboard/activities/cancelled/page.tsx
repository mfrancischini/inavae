import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../actions";
import { BackToDashboardLink } from "../../back-to-dashboard-link";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function CancelledActivitiesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { churchId: true, church: { select: { name: true } } },
  });
  if (!user) redirect("/");

  const activities = await prisma.activity.findMany({
    where: {
      churchId: user.churchId,
      status: "CANCELLED",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      updatedAt: true,
      notes: true,
      place: true,
      activityType: { select: { code: true, name: true } },
      scHousehold: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <BackToDashboardLink />
          <p className="dashboard-kicker">{user.church.name} · Agenda</p>
          <h1>Actividades canceladas</h1>
          <p className="dashboard-intro">Actividades dadas de baja. Se conservan como historial y no se eliminan.</p>
        </div>
      </header>

      <section className="dashboard-section" aria-labelledby="cancelled-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-kicker">Historial</p><h2 id="cancelled-title">Canceladas</h2></div>
        </div>
        <div className="activity-list">
          {activities.length === 0 ? (
            <p className="dashboard-empty">No hay actividades canceladas.</p>
          ) : activities.map((activity) => (
            <article className="activity-row" key={activity.id}>
              <div className="activity-date">
                <strong>{activity.activityType.code}</strong>
                <span>{dateFormatter.format(activity.scheduledAt)}</span>
              </div>
              <div className="activity-detail">
                <h3>{activity.activityType.name}</h3>
                <p><strong>Creada por:</strong> {activity.createdBy.firstName} {activity.createdBy.lastName}</p>
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
                <span className="activity-status activity-status-cancelled">Cancelada</span>
                <span className="activity-column-label">{dateFormatter.format(activity.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
