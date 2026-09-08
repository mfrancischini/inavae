import { redirect } from "next/navigation";

import { getSessionUserId } from "../../../../actions";
import { prisma } from "@/lib/prisma";
import { updateHousehold } from "../../../household-actions";

function formatDateInput(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function EditHouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const { id } = await params;
  const [household, user] = await Promise.all([
    prisma.scHousehold.findUnique({
      where: { id },
      select: { id: true, churchId: true, createdById: true, name: true, address: true, phone: true, notes: true, frequencyDays: true, nextVisitAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
    }),
  ]);

  const isAdmin = user?.roles.some(({ role }) => role.name === "ADMIN") ?? false;
  if (!household || !user || household.churchId !== user.churchId || (household.createdById !== userId && !isAdmin)) {
    redirect("/dashboard/households");
  }

  return (
    <main className="dashboard-shell">
      <section className="activity-editor">
        <p className="dashboard-kicker">{user.church.name} · Santa Cena</p>
        <h1>Modificar hogar</h1>
        <p className="dashboard-intro">Actualizá la información y la periodicidad de este hogar.</p>
        <form className="activity-form household-form" action={updateHousehold}>
          <input type="hidden" name="householdId" value={household.id} />
          <div className="activity-form-grid">
            <label>Nombre del hogar<input name="name" required defaultValue={household.name} /></label>
            <label>Periodicidad en días<input name="frequencyDays" type="number" min="1" required defaultValue={household.frequencyDays} /></label>
            <label>Próxima visita<input name="nextVisitAt" type="date" defaultValue={formatDateInput(household.nextVisitAt)} /></label>
            <label>Dirección<input name="address" defaultValue={household.address ?? ""} /></label>
            <label>Teléfono<input name="phone" type="tel" defaultValue={household.phone ?? ""} /></label>
            <label className="activity-form-wide">Notas<textarea name="notes" rows={3} defaultValue={household.notes ?? ""} /></label>
          </div>
          <div className="activity-form-actions">
            <a className="activity-cancel" href="/dashboard/households">Cancelar</a>
            <button className="submit-button activity-submit" type="submit">Guardar cambios <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>
    </main>
  );
}
