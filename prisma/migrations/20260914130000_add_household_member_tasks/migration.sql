-- CreateEnum
CREATE TYPE "HouseholdMemberTask" AS ENUM ('CORO', 'ENSENANZA', 'LIMPIEZA', 'ARREGLO_FLORAL');

-- AlterTable
ALTER TABLE "HouseholdMember" ADD COLUMN "tasks" "HouseholdMemberTask"[] NOT NULL DEFAULT ARRAY[]::"HouseholdMemberTask"[];
