import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../../../../actions";
import { updateHouseholdMember } from "../../../../../household-actions";
import { householdMemberTaskLabels, householdMemberTaskOptions } from "../../../../../household-member-tasks";
import { BackToDashboardLink } from "../../../../../back-to-dashboard-link";

function formatDateInput(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function EditHouseholdMemberPage({ params }: { params: Promise<{ id: string; memberId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const { id, memberId } = await params;
  const [user, member] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { churchId: true, church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
    }),
    prisma.householdMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        householdId: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        phone: true,
        status: true,
        tasks: true,
        household: { select: { id: true, churchId: true, createdById: true, name: true } },
      },
    }),
  ]);

  const isAdmin = user?.roles.some(({ role }) => role.name === "ADMIN") ?? false;
  if (
    !user ||
    !member ||
    member.status !== "ACTIVE" ||
    member.householdId !== id ||
    member.household.churchId !== user.churchId ||
    (member.household.createdById !== userId && !isAdmin)
  ) {
    redirect(`/dashboard/households/${id}/members`);
  }

  return (
    <main className="dashboard-shell">
      <section className="activity-editor">
        <BackToDashboardLink />
        <p className="dashboard-kicker">{user.church.name} · {member.household.name}</p>
        <h1>Modificar integrante</h1>
        <p className="dashboard-intro">Actualizá los datos de este integrante del hogar.</p>
        <form className="activity-form member-form" action={updateHouseholdMember}>
          <input type="hidden" name="householdId" value={member.householdId} />
          <input type="hidden" name="memberId" value={member.id} />
          <div className="activity-form-grid">
            <label>Nombre<input name="firstName" required defaultValue={member.firstName} /></label>
            <label>Apellido<input name="lastName" required defaultValue={member.lastName} /></label>
            <label>Fecha de nacimiento<input name="birthDate" type="date" defaultValue={formatDateInput(member.birthDate)} /></label>
            <label>Teléfono<input name="phone" type="tel" defaultValue={member.phone ?? ""} /></label>
            <fieldset className="activity-form-fieldset activity-form-wide">
              <legend>Tareas</legend>
              <div className="activity-user-options">
                {householdMemberTaskOptions.map((task) => (
                  <label className="activity-user-option" key={task}>
                    <input type="checkbox" name="tasks" value={task} defaultChecked={member.tasks.includes(task)} />
                    <span>{householdMemberTaskLabels[task]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="activity-form-actions">
            <a className="activity-cancel" href={`/dashboard/households/${member.householdId}/members`}>Cancelar</a>
            <button className="submit-button activity-submit" type="submit">Guardar cambios <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>
    </main>
  );
}
