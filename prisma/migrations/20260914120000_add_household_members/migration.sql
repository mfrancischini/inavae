-- CreateEnum
CREATE TYPE "HouseholdMemberRelation" AS ENUM ('PADRE', 'MADRE', 'HIJO', 'HIJA', 'OTRO');

-- CreateEnum
CREATE TYPE "HouseholdMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "relationship" "HouseholdMemberRelation" NOT NULL DEFAULT 'OTRO',
    "birthDate" DATE,
    "phone" TEXT,
    "status" "HouseholdMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_status_idx" ON "HouseholdMember"("householdId", "status");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "ScHousehold"("id") ON DELETE CASCADE ON UPDATE CASCADE;
