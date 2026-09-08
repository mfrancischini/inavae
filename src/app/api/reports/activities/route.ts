import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { validateSessionToken } from "@/app/auth-session";

const sessionCookieName = "inavae_session";

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "replace-with-a-local-secret") throw new Error("AUTH_SECRET no configurado");
  return secret;
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}-03:00`);
}

export async function GET(request: NextRequest) {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !validateSessionToken(token, getSessionSecret(), Math.floor(Date.now() / 1000))) {
    return new Response("No autorizado", { status: 401 });
  }

  const userId = token.split(".")[0];
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { churchId: true } });
  if (!user) return new Response("No autorizado", { status: 401 });

  const from = parseDate(request.nextUrl.searchParams.get("from"));
  const to = parseDate(request.nextUrl.searchParams.get("to"), true);
  if (!from || !to || from > to) return new Response("Período inválido", { status: 400 });

  const activities = await prisma.activity.findMany({
    where: { churchId: user.churchId, scheduledAt: { gte: from, lte: to } },
    orderBy: { scheduledAt: "asc" },
    select: {
      scheduledAt: true,
      status: true,
      notes: true,
      place: true,
      activityType: { select: { code: true, name: true } },
      scHousehold: { select: { name: true, address: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      participants: {
        select: {
          user: { select: { firstName: true, lastName: true } },
          companion: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const rows = activities.map((activity) => {
    const people = [
      `${activity.createdBy.firstName} ${activity.createdBy.lastName}`,
      ...activity.participants.map(({ user: participant, companion }) => {
        const person = participant ?? companion;
        return person ? `${person.firstName} ${person.lastName}` : "";
      }),
    ].filter((name, index, names) => name && names.indexOf(name) === index);

    return {
      Fecha: new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(activity.scheduledAt),
      Tipo: activity.activityType.code,
      Actividad: activity.activityType.name,
      Hogar: activity.scHousehold?.name ?? activity.place ?? "",
      Dirección: activity.scHousehold?.address ?? "",
      Creador: `${activity.createdBy.firstName} ${activity.createdBy.lastName}`,
      Siervos: people.join(" y "),
      Estado: activity.status === "SCHEDULED" ? "Programada" : activity.status === "COMPLETED" ? "Completada" : "Cancelada",
      Notas: activity.notes ?? "",
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 34 }, { wch: 26 }, { wch: 28 }, { wch: 25 }, { wch: 42 }, { wch: 14 }, { wch: 45 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Actividades");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `actividades-${request.nextUrl.searchParams.get("from")}-${request.nextUrl.searchParams.get("to")}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
