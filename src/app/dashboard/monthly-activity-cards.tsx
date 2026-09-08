"use client";

import { useState } from "react";

import { X } from "lucide-react";

type MonthlyActivity = {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  householdName: string;
};

type MonthlyActivityCardsProps = {
  monthName: string;
  vaeCount: number;
  scCount: number;
  vaeActivities: MonthlyActivity[];
  scActivities: MonthlyActivity[];
};

const statusLabels = {
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
} as const;

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function MonthlyActivityCards({ monthName, vaeCount, scCount, vaeActivities, scActivities }: MonthlyActivityCardsProps) {
  const [selectedType, setSelectedType] = useState<"VAE" | "SC" | null>(null);
  const activities = selectedType === "VAE" ? vaeActivities : scActivities;

  return (
    <>
      <section className="dashboard-stats" aria-label="Resumen mensual de actividades">
        <button className="dashboard-stat dashboard-stat-primary dashboard-stat-button" type="button" onClick={() => setSelectedType("VAE")}>
          <span>VAE del mes</span>
          <strong>{vaeCount}</strong>
          <small>Ver visitas de asistencia espiritual</small>
        </button>
        <button className="dashboard-stat dashboard-stat-button" type="button" onClick={() => setSelectedType("SC")}>
          <span>SC del mes</span>
          <strong>{scCount}</strong>
          <small>Ver visitas de Santa Cena</small>
        </button>
        <article className="dashboard-stat">
          <span>Período</span>
          <strong>{monthName}</strong>
          <small>Actividades del mes actual</small>
        </article>
      </section>

      {selectedType && (
        <div className="activity-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedType(null)}>
          <section className="activity-modal" role="dialog" aria-modal="true" aria-labelledby="monthly-activity-title">
            <div className="activity-modal-header">
              <div>
                <p className="dashboard-kicker">{monthName}</p>
                <h2 id="monthly-activity-title">{selectedType === "VAE" ? "VAE del mes" : "SC del mes"}</h2>
              </div>
              <button className="activity-modal-close" type="button" onClick={() => setSelectedType(null)} aria-label="Cerrar detalle" title="Cerrar">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {activities.length === 0 ? (
              <p className="dashboard-empty">No hay actividades de este tipo en el mes.</p>
            ) : (
              <div className="activity-modal-list">
                {activities.map((activity) => (
                  <article className="monthly-vae-row" key={activity.id}>
                    <div>
                      <strong>{activity.householdName}</strong>
                      <span>{dateFormatter.format(new Date(activity.scheduledAt))}</span>
                    </div>
                    <span className={`activity-status activity-status-${activity.status.toLowerCase()}`}>
                      {statusLabels[activity.status]}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
