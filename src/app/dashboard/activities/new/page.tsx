import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "../../../actions";
import { ActivityForm } from "../../activity-form";

export default async function NewActivityPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      churchId: true,
      church: { select: { name: true } },
    },
  });
  if (!user) redirect("/");

  const [activityTypes, people, users, households] = await Promise.all([
    prisma.activityType.findMany({
      where: { churchId: user.churchId, isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, requiresVisitedPerson: true },
    }),
    prisma.visitedPerson.findMany({
      where: { churchId: user.churchId, status: "ACTIVE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.user.findMany({
      where: { churchId: user.churchId, status: "ACTIVE", id: { not: userId } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.scHousehold.findMany({
      where: { churchId: user.churchId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
  ]);

  return (
    <main className="dashboard-shell">
      <section className="activity-editor">
        <p className="dashboard-kicker">{user.church.name} · Agenda</p>
        <h1>Nueva actividad</h1>
        <p className="dashboard-intro">Completá los datos para sumar una actividad a la agenda.</p>
        <Link className="household-manage-link" href="/dashboard/households">Administrar hogares registrados</Link>
        <ActivityForm
          activityTypes={activityTypes}
          people={people.map((person) => ({ id: person.id, name: `${person.lastName}, ${person.firstName}` }))}
          users={users.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}` }))}
          households={households}
        />
        <div className="activity-back-link">
          <Link href="/dashboard">Volver al dashboard</Link>
        </div>
      </section>
    </main>
  );
}
