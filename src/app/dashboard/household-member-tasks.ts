import { HouseholdMemberTask } from "@/generated/prisma";

export const householdMemberTaskLabels: Record<HouseholdMemberTask, string> = {
  CORO: "Coro",
  ENSENANZA: "Enseñanza",
  LIMPIEZA: "Limpieza",
  ARREGLO_FLORAL: "Arreglo Floral",
  RESUMEN: "Resumen",
};

export const householdMemberTaskOptions = Object.values(HouseholdMemberTask);
