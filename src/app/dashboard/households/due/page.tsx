import { redirect } from "next/navigation";
import Link from "next/link";

import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function getEffectiveNextVisit(household: { createdAt: Date; nextVisitAt: Date | null; lastVisitAt: Date | null; frequencyDays: number | null }) {
  if (!household.frequencyDays) return null;
  if (household.nextVisitAt && (household.lastVisitAt || household.nextVisitAt.getTime() > household.createdAt.getTime() + 86400000)) {
    return household.nextVisitAt;
  }
  return new Date(household.createdAt.getTime() + household.frequencyDays * 86400000);
}

export default async function HouseholdDuePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { churchId: true, church: { select: { name: true } } },
  });
  if (!user) redirect("/");

  const households = await prisma.scHousehold.findMany({
    where: {
      churchId: user.churchId,
      status: "ACTIVE",
      frequencyDays: { gt: 0 },
      nextVisitAt: { not: null },
    },
    orderBy: { nextVisitAt: "asc" },
    select: { id: true, name: true, address: true, frequencyDays: true, nextVisitAt: true, lastVisitAt: true, createdAt: true },
  });

  const dueRows = households.map((household) => ({
    ...household,
    nextVisitAt: getEffectiveNextVisit(household) as Date,
  })).map((household) => ({
    ...household,
    days: daysUntil(household.nextVisitAt),
  }));
  const counts = {
    overdue: dueRows.filter(({ days }) => days < 0).length,
    today: dueRows.filter(({ days }) => days === 0).length,
    upcoming: dueRows.filter(({ days }) => days > 0).length,
  };
  const maxCount = Math.max(counts.overdue, counts.today, counts.upcoming, 1);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{user.church.name} · Santa Cena</p>
          <h1>Santa Cenas</h1>
          <p className="dashboard-intro">Hogares con periodicidad y próxima visita definida.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="activity-cancel" href="/dashboard">Volver al dashboard</Link>
          <Link className="activity-cancel" href="/dashboard/households">Administrar hogares</Link>
        </div>
      </header>

      <section className="due-summary" aria-label="Resumen de Santa Cenas">
        <article><strong>{counts.overdue}</strong><span>Vencidos</span></article>
        <article><strong>{counts.today}</strong><span>Vencen hoy</span></article>
        <article><strong>{counts.upcoming}</strong><span>Próximos</span></article>
      </section>

      <section className="due-chart" aria-labelledby="due-chart-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-kicker">Estado</p><h2 id="due-chart-title">Resumen de Santa Cenas</h2></div>
        </div>
        {([ ["Vencidos", counts.overdue, "overdue"], ["Vencen hoy", counts.today, "today"], ["Próximos", counts.upcoming, "upcoming"] ] as const).map(([label, count, tone]) => (
          <div className="due-chart-row" key={tone}>
            <span>{label}</span>
            <div className="due-chart-track"><div className={`due-chart-bar due-chart-bar-${tone}`} style={{ width: `${(count / maxCount) * 100}%` }} /></div>
            <strong>{count}</strong>
          </div>
        ))}
      </section>

      <section className="dashboard-section due-list" aria-labelledby="due-list-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-kicker">Agenda SC</p><h2 id="due-list-title">Santa Cenas programadas</h2></div>
          <CalendarClock size={24} aria-hidden="true" />
        </div>
        {dueRows.length === 0 ? <p className="dashboard-empty">No hay hogares con periodicidad y fecha de próxima visita.</p> : dueRows.map((household) => (
          <article className={`due-household due-household-${household.days < 0 ? "overdue" : household.days === 0 ? "today" : "upcoming"}`} key={household.id}>
            <div>
              <h3><Link className="household-name-link" href={`/dashboard/households/${household.id}`}>{household.name}</Link></h3>
              <p>{household.address ?? "Sin dirección"} · Cada {household.frequencyDays} días</p>
            </div>
            <div className="due-household-date">
              <strong>{household.days < 0 ? `Vencido hace ${Math.abs(household.days)} días` : household.days === 0 ? "Vence hoy" : `Vence en ${household.days} días`}</strong>
              <span>{dateFormatter.format(household.nextVisitAt as Date)}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
