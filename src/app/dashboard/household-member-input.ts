import { HouseholdMemberRelation } from "@/generated/prisma";

const householdMemberRelations = new Set<string>(Object.values(HouseholdMemberRelation));

export function parseHouseholdMemberInput(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const relationshipValue = String(formData.get("relationship") ?? "OTRO").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthDateValue = String(formData.get("birthDate") ?? "").trim();

  if (!firstName || !lastName || !householdMemberRelations.has(relationshipValue)) return null;

  let birthDate: Date | null = null;
  if (birthDateValue) {
    birthDate = new Date(`${birthDateValue}T00:00:00-03:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
  }

  return {
    firstName,
    lastName,
    relationship: relationshipValue as HouseholdMemberRelation,
    birthDate,
    phone: phone || null,
  };
}
