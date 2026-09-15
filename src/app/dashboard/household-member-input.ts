import { HouseholdMemberTask } from "@/generated/prisma";

const householdMemberTasks = new Set<string>(Object.values(HouseholdMemberTask));

function parseHouseholdMemberTasks(formData: FormData): HouseholdMemberTask[] {
  const values = formData.getAll("tasks").map((value) => String(value));
  const tasks = new Set<HouseholdMemberTask>();
  for (const value of values) {
    if (householdMemberTasks.has(value)) tasks.add(value as HouseholdMemberTask);
  }
  return [...tasks];
}

export function parseHouseholdMemberInput(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthDateValue = String(formData.get("birthDate") ?? "").trim();

  if (!firstName || !lastName) return null;

  let birthDate: Date | null = null;
  if (birthDateValue) {
    birthDate = new Date(`${birthDateValue}T00:00:00-03:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
  }

  return {
    firstName,
    lastName,
    birthDate,
    phone: phone || null,
    tasks: parseHouseholdMemberTasks(formData),
  };
}
