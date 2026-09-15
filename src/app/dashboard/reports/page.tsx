import { redirect } from "next/navigation";

import { FileSpreadsheet } from "lucide-react";
import { getSessionUserId } from "../../actions";
import { prisma } from "@/lib/prisma";
import { BackToDashboardLink } from "../back-to-dashboard-link";

function getMonthBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}` };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { church: { select: { name: true } } },
  });
  if (!user) redirect("/");

  const params = await searchParams;
  const defaults = getMonthBounds();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;

  return (
    <main className="dashboard-shell">
      <section className="report-editor">
        <header className="dashboard-header report-header">
          <div>
            <BackToDashboardLink />
            <p className="dashboard-kicker">{user.church.name} · Reportes</p>
            <h1>Actividades</h1>
            <p className="dashboard-intro">Elegí un período para descargar todas las actividades en Excel.</p>
          </div>
        </header>

        <div className="report-how-it-works" aria-label="Cómo usar el reporte">
          <strong>¿Qué querés exportar?</strong>
          <span>1. Elegí la fecha inicial y final.</span>
          <span>2. Aplicá el período para actualizar la selección.</span>
          <span>3. Descargá el Excel con las actividades de esas fechas.</span>
        </div>

        <form className="report-filter" method="get">
          <label>Desde<input type="date" name="from" defaultValue={from} required /></label>
          <label>Hasta<input type="date" name="to" defaultValue={to} required /></label>
          <button className="report-preview-button" type="submit">Aplicar período</button>
          <a className="report-download-button" href={`/api/reports/activities?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}>
            <FileSpreadsheet size={17} aria-hidden="true" /> Descargar Excel
          </a>
        </form>

        <p className="report-hint">El Excel incluirá actividades programadas, completadas y canceladas dentro del período elegido. No modifica ninguna actividad.</p>
      </section>
    </main>
  );
}
