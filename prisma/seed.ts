import bcrypt from "bcryptjs";
import {
  ActivityStatus,
  PrismaClient,
  UserStatus,
  VisitedPersonStatus,
} from "../src/generated/prisma";

const prisma = new PrismaClient();
const timezone = "America/Argentina/Buenos_Aires";

async function main() {
  const passwordHash = await bcrypt.hash("123456", 12);
  const church = await prisma.church.upsert({
    where: { slug: "carapachay" },
    update: { name: "Iglesia de Carapachay", timezone, isActive: true },
    create: { name: "Iglesia de Carapachay", slug: "carapachay", timezone },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { description: "Acceso completo al sistema" },
    create: { name: "ADMIN", description: "Acceso completo al sistema" },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: { description: "Gestiona sus actividades y consulta informacion" },
    create: { name: "USER", description: "Gestiona sus actividades y consulta informacion" },
  });

  await prisma.user.updateMany({
    where: { email: "admin@inavae.local" },
    data: { email: "carapa@inavae.local" },
  });

  const users = await Promise.all(
    [
      { firstName: "Mariano", lastName: "Administrador", email: "carapa@inavae.local", roleId: adminRole.id },
      { firstName: "Carlos", lastName: "Gomez", email: "carlos@inavae.local", roleId: userRole.id },
      { firstName: "Pedro", lastName: "Rodriguez", email: "pedro@inavae.local", roleId: userRole.id },
    ].map(async (data) => {
      const user = await prisma.user.upsert({
        where: { email: data.email },
        update: {
          churchId: church.id,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
        create: {
          churchId: church.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: data.roleId } },
        update: {},
        create: { userId: user.id, roleId: data.roleId },
      });
      return user;
    }),
  );

  const activityTypes = await Promise.all([
    prisma.activityType.upsert({
      where: { churchId_code: { churchId: church.id, code: "VAE" } },
      update: { name: "Visita de Asistencia Espiritual", requiresVisitedPerson: true, isActive: true },
      create: {
        churchId: church.id,
        code: "VAE",
        name: "Visita de Asistencia Espiritual",
        requiresVisitedPerson: true,
      },
    }),
    prisma.activityType.upsert({
      where: { churchId_code: { churchId: church.id, code: "SC" } },
      update: { name: "Santa Cena", requiresVisitedPerson: false, isActive: true },
      create: { churchId: church.id, code: "SC", name: "Santa Cena", requiresVisitedPerson: false },
    }),
  ]);

  const peopleData = [
    ["Juan", "Perez"],
    ["Ana", "Martinez"],
    ["Laura", "Fernandez"],
    ["Miguel", "Sanchez"],
    ["Sofia", "Lopez"],
    ["Elena", "Diaz"],
    ["Roberto", "Torres"],
    ["Marta", "Ruiz"],
    ["Diego", "Alvarez"],
    ["Claudia", "Romero"],
  ];
  const people = [];
  for (const [firstName, lastName] of peopleData) {
    const existing = await prisma.visitedPerson.findFirst({
      where: { churchId: church.id, firstName, lastName },
    });
    people.push(
      existing ??
        (await prisma.visitedPerson.create({
          data: {
            churchId: church.id,
            firstName,
            lastName,
            status: VisitedPersonStatus.ACTIVE,
          },
        })),
    );
  }

  const activities = [
    { typeId: activityTypes[0].id, scheduledAt: "2026-09-05T18:00:00-03:00", personId: people[0].id, createdById: users[1].id, status: ActivityStatus.SCHEDULED },
    { typeId: activityTypes[1].id, scheduledAt: "2026-09-06T10:00:00-03:00", personId: null, createdById: users[0].id, status: ActivityStatus.SCHEDULED },
    { typeId: activityTypes[0].id, scheduledAt: "2026-09-08T19:00:00-03:00", personId: people[1].id, createdById: users[2].id, status: ActivityStatus.SCHEDULED },
    { typeId: activityTypes[0].id, scheduledAt: "2026-09-12T17:30:00-03:00", personId: people[2].id, createdById: users[1].id, status: ActivityStatus.COMPLETED },
    { typeId: activityTypes[1].id, scheduledAt: "2026-09-13T10:00:00-03:00", personId: null, createdById: users[0].id, status: ActivityStatus.CANCELLED },
  ];

  for (const data of activities) {
    const scheduledAt = new Date(data.scheduledAt);
    const existing = await prisma.activity.findFirst({
      where: { churchId: church.id, activityTypeId: data.typeId, scheduledAt },
    });
    const activity = existing
      ? await prisma.activity.update({
          where: { id: existing.id },
          data: { visitedPersonId: data.personId, createdById: data.createdById, status: data.status },
        })
      : await prisma.activity.create({
          data: {
            churchId: church.id,
            activityTypeId: data.typeId,
            scheduledAt,
            visitedPersonId: data.personId,
            createdById: data.createdById,
            status: data.status,
          },
        });

    await prisma.activityUser.deleteMany({ where: { activityId: activity.id } });
    await prisma.activityUser.createMany({
      data: users.slice(1).map((user) => ({ activityId: activity.id, userId: user.id })),
      skipDuplicates: true,
    });
  }

  console.log("Seed de desarrollo completado.");
  console.log(`Usuarios: ${users.length}; Personas: ${people.length}; Actividades: ${activities.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
