import { redirect } from "next/navigation";
import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../actions";
import { BackToDashboardLink } from "../../back-to-dashboard-link";
import { HouseholdImportForm } from "./household-import-form";

export default async function HouseholdImportPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) redirect("/");

  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");
  if (!isAdmin) redirect("/dashboard/households");

  return (
    <main className="dashboard-shell">
      <section className="activity-editor">
        <BackToDashboardLink />
        <p className="dashboard-kicker">{user.church.name} · Hogares</p>
        <h1>Importar hogares desde Excel</h1>
        <p className="dashboard-intro">
          Cargá varios hogares e integrantes a la vez desde una planilla. Cada fila representa un integrante; las filas con
          el mismo nombre de hogar se agrupan automáticamente.
        </p>

        <a className="household-template-download" href="/api/households/import-template">
          <Download size={18} strokeWidth={2} aria-hidden="true" />
          <span>Descargar planilla de ejemplo</span>
        </a>

        <HouseholdImportForm />
      </section>
    </main>
  );
}
