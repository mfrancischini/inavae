import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";

import { getSessionUserId } from "../../actions";
import { prisma } from "@/lib/prisma";
import { createHousehold } from "../household-actions";
import { BackToDashboardLink } from "../back-to-dashboard-link";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function firstLetter(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
  const char = normalized.charAt(0);
  return ALPHABET.includes(char) ? char : "#";
}

export default async function HouseholdsPage({ searchParams }: { searchParams: Promise<{ q?: string; letter?: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedLetter = params.letter?.trim().toUpperCase() ?? "";
  const selectedLetter = requestedLetter && (ALPHABET.includes(requestedLetter) || requestedLetter === "#") ? requestedLetter : "";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { churchId: true, church: { select: { name: true } }, roles: { select: { role: { select: { name: true } } } } },
  });
  if (!user) redirect("/");
  const isAdmin = user.roles.some(({ role }) => role.name === "ADMIN");

  const where = {
    churchId: user.churchId,
    status: "ACTIVE" as const,
    ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { address: { contains: query, mode: "insensitive" as const } }] } : {}),
  };
  const allMatches = await prisma.scHousehold.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  const availableLetters = new Set(allMatches.map((household) => firstLetter(household.name)));
  const total = allMatches.length;
  const households = selectedLetter ? allMatches.filter((household) => firstLetter(household.name) === selectedLetter) : allMatches;

  return (
    <main className="dashboard-shell">
      <div className="households-layout">
        <section className="activity-editor">
          <BackToDashboardLink />
          <div className="household-page-heading">
            <div>
              <p className="dashboard-kicker">{user.church.name} · Santa Cena</p>
              <h1>Hogares</h1>
            </div>
            {isAdmin && (
              <div className="dashboard-actions">
                <Link
                  className="dashboard-action dashboard-action-house"
                  href="/dashboard/households/import"
                  aria-label="Importar hogares e integrantes desde Excel"
                  title="Importar hogares e integrantes desde Excel"
                >
                  <Upload size={17} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
          <p className="dashboard-intro">Registrá los hogares y la periodicidad con la que deben volver a visitarse.</p>

          <form className="activity-form household-form" action={createHousehold}>
            <div className="activity-form-grid">
              <label>Nombre del hogar<input name="name" required placeholder="Ej. Familia González" /></label>
              <label>Periodicidad en días<input name="frequencyDays" type="number" min="1" placeholder="Opcional: 30" /></label>
              <label>Próxima visita<input name="nextVisitAt" type="date" /></label>
              <label>Dirección<input name="address" placeholder="Calle y número" /></label>
              <label>Teléfono<input name="phone" type="tel" /></label>
              <label className="activity-form-wide">Notas<textarea name="notes" rows={3} /></label>
            </div>
            <div className="activity-form-actions">
              <a className="activity-cancel" href="/dashboard">Volver al dashboard</a>
              <button className="submit-button activity-submit" type="submit">Guardar hogar <span aria-hidden="true">→</span></button>
            </div>
          </form>
        </section>

        <section className="household-list" aria-labelledby="households-title">
          <div className="dashboard-section-heading">
            <div><p className="dashboard-kicker">Registro SC</p><h2 id="households-title">Hogares activos</h2></div>
          </div>
          <form className="household-search" method="get">
            <input name="q" type="search" defaultValue={query} placeholder="Buscar por hogar o dirección" aria-label="Buscar hogares" />
            <button type="submit">Buscar</button>
          </form>
          {total > 0 && (
            <nav className="household-alphabet" aria-label="Paginación de hogares por letra">
              <Link
                className={selectedLetter ? "" : "household-alphabet-active"}
                href={`/dashboard/households?q=${encodeURIComponent(query)}`}
              >
                Todos
              </Link>
              {[...ALPHABET, "#"].map((letter) => {
                const isAvailable = availableLetters.has(letter);
                const isActive = selectedLetter === letter;
                if (!isAvailable) {
                  return <span key={letter} className="household-alphabet-disabled">{letter}</span>;
                }
                return (
                  <Link
                    key={letter}
                    className={isActive ? "household-alphabet-active" : ""}
                    href={`/dashboard/households?q=${encodeURIComponent(query)}&letter=${letter}`}
                  >
                    {letter}
                  </Link>
                );
              })}
            </nav>
          )}
          {total === 0 ? (
            <p className="dashboard-empty">{query ? "No encontramos hogares con esa búsqueda." : "Todavía no hay hogares registrados."}</p>
          ) : households.length === 0 ? (
            <p className="dashboard-empty">No hay hogares que empiecen con &ldquo;{selectedLetter}&rdquo;.</p>
          ) : households.map((household) => {
            return <article className="household-card" key={household.id}>
              <div>
                <h3><Link className="household-name-link" href={`/dashboard/households/${household.id}`}>{household.name}</Link></h3>
              </div>
              <div className="household-card-actions">
                <Link className="household-edit-link" href={`/dashboard/households/${household.id}/members`}>Integrantes</Link>
                <Link className="household-edit-link" href={`/dashboard/households/${household.id}/edit`}>Modificar</Link>
              </div>
            </article>
          })}
        </section>
      </div>
    </main>
  );
}
