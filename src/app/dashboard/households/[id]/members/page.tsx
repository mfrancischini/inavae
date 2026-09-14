import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../../actions";
import { addHouseholdMember, deactivateHouseholdMember } from "../../../household-actions";

const birthDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

const relationLabels = {
  PADRE: "Padre",
  MADRE: "Madre",
  HIJO: "Hijo",
  HIJA: "Hija",
  OTRO: "Otro",
} as const;

export default async function HouseholdMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const { id } = await params;
  const [user, household] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
    }),
    prisma.scHousehold.findUnique({
      where: { id },
      select: {
        id: true,
        churchId: true,
        createdById: true,
        name: true,
        members: {
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "asc" }],
          select: { id: true, firstName: true, lastName: true, relationship: true, birthDate: true, phone: true },
        },
      },
    }),
  ]);

  if (!user || !household || household.churchId !== user.churchId) redirect("/dashboard/households");

  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");
  const canManage = household.createdById === userId || isAdmin;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header household-detail-header">
        <div>
          <p className="dashboard-kicker">{user.church.name} · Hogar SC</p>
          <h1>{household.name}</h1>
          <p className="dashboard-intro">Integrantes de la familia para este hogar.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="activity-cancel" href={`/dashboard/households/${household.id}`}>Volver al hogar</Link>
          <Link className="dashboard-action" href={`/dashboard/households/${household.id}/edit`}>Modificar</Link>
        </div>
      </header>

      <section className="dashboard-section household-members" aria-labelledby="members-title">
        <div className="dashboard-section-heading">
          <div><p className="dashboard-kicker">Familia</p><h2 id="members-title">Integrantes del hogar</h2></div>
          <span className="household-history-count">{household.members.length} integrantes</span>
        </div>

        {household.members.length === 0 ? (
          <p className="dashboard-empty">Todavía no hay integrantes cargados para este hogar.</p>
        ) : (
          <div className="member-list">
            {household.members.map((member) => (
              <article className="member-row" key={member.id}>
                <div className="member-detail">
                  <strong>{member.firstName} {member.lastName}</strong>
                  <span className="activity-column-label">{relationLabels[member.relationship]}</span>
                </div>
                <div className="member-meta">
                  <span>{member.birthDate ? birthDateFormatter.format(member.birthDate) : "Sin fecha de nacimiento"}</span>
                  <span>{member.phone ?? "Sin teléfono"}</span>
                </div>
                {canManage && (
                  <div className="member-row-actions">
                    <Link className="household-edit-link" href={`/dashboard/households/${household.id}/members/${member.id}/edit`}>Modificar</Link>
                    <form action={deactivateHouseholdMember}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <input type="hidden" name="householdId" value={household.id} />
                      <button type="submit" className="activity-cancel">Inactivar</button>
                    </form>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {canManage && (
          <form className="activity-form member-form" action={addHouseholdMember}>
            <input type="hidden" name="householdId" value={household.id} />
            <div className="activity-form-grid">
              <label>Nombre<input name="firstName" required placeholder="Ej. Juan" /></label>
              <label>Apellido<input name="lastName" required placeholder="Ej. Fernández" /></label>
              <label>Parentesco
                <select name="relationship" defaultValue="OTRO">
                  <option value="PADRE">Padre</option>
                  <option value="MADRE">Madre</option>
                  <option value="HIJO">Hijo</option>
                  <option value="HIJA">Hija</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>
              <label>Fecha de nacimiento<input name="birthDate" type="date" /></label>
              <label>Teléfono<input name="phone" type="tel" /></label>
            </div>
            <div className="activity-form-actions">
              <button className="submit-button activity-submit" type="submit">Agregar integrante <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
