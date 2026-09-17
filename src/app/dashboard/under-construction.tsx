import { Construction } from "lucide-react";

import { BackToDashboardLink } from "./back-to-dashboard-link";

export function UnderConstructionPage({ kicker, title }: { kicker: string; title: string }) {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <BackToDashboardLink />
          <p className="dashboard-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
      </header>

      <section className="dashboard-section under-construction" aria-label="Sección en construcción">
        <Construction size={40} strokeWidth={1.5} aria-hidden="true" />
        <h2>En construcción</h2>
        <p className="dashboard-intro">Esta sección todavía no está disponible. Estamos trabajando para sumarla próximamente.</p>
      </section>
    </main>
  );
}
