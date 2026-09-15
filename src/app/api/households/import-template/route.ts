import { cookies } from "next/headers";

import { validateSessionToken } from "@/app/auth-session";
import { buildHouseholdImportTemplate } from "@/app/dashboard/household-import";

const sessionCookieName = "inavae_session";

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "replace-with-a-local-secret") throw new Error("AUTH_SECRET no configurado");
  return secret;
}

export async function GET() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !validateSessionToken(token, getSessionSecret(), Math.floor(Date.now() / 1000))) {
    return new Response("No autorizado", { status: 401 });
  }

  const buffer = buildHouseholdImportTemplate();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-hogares.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
