# INAVAE

Aplicacion web responsive para gestionar actividades de la iglesia de Carapachay.

## Stack

- Next.js 16 con App Router
- React y TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Docker Compose para desarrollo local
- Vercel como destino de deployment

## Requisitos

- Node.js 22 o superior
- npm
- Docker Desktop (necesario desde la Fase 2 para PostgreSQL local)

## Desarrollo

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` como `.env` y completar los valores locales.

3. Iniciar el servidor web:

   ```bash
   npm run dev
   ```

4. Abrir http://localhost:3000.

## PostgreSQL local

La base local se ejecuta con Docker Compose:

```bash
docker compose up -d
docker compose down
```

Las migraciones, el seed y el modelo se configuraran en la Fase 2.

Para la Fase 2, con Docker Desktop iniciado:

```bash
docker compose up -d
npm run db:migrate -- --name init
npm run db:seed
```

Para detener o reiniciar la base:

```bash
docker compose down
npm run db:reset
```

## Comandos disponibles

```bash
npm run lint
npm run build
npm run db:generate
npm run db:format
npm run db:validate
npm run db:migrate
npm run db:seed
npm run db:reset
```

## Estado del proyecto

La Fase 2 contiene el modelo relacional de Prisma, la configuracion del seed y los datos ficticios preparados. La migracion y el seed deben ejecutarse cuando Docker Desktop tenga disponible PostgreSQL local.

El modelo incluye `Church`, `User`, `Role`, `UserRole`, `ActivityType`, `Activity`, `VisitedPerson`, `ActivityUser`, `AuditLog` y `PasswordResetToken`.

## Decisiones del MVP

- Zona horaria oficial: `America/Argentina/Buenos_Aires`.
- `USER` solo puede editar y cancelar sus propias actividades.
- Las actividades se cancelan con estado `CANCELADA`.
- Las personas con historial se marcan como inactivas y conservan sus datos.
- La recuperacion de contrasena usara email con proveedor desacoplado.
