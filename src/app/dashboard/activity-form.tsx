"use client";

import { useActionState } from "react";

import { createActivity, updateActivity } from "./activity-actions";

const initialState = { error: "" };

type ActivityOption = {
  id: string;
  name: string;
  code: string;
  requiresVisitedPerson: boolean;
};

type PersonOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string;
};

type HouseholdOption = {
  id: string;
  name: string;
  address: string | null;
};

type ActivityValues = {
  id: string;
  activityTypeId: string;
  scheduledAt: string;
  scHouseholdId: string;
  notes: string;
  companionUserIds: string[];
  externalCompanions: string;
};

export function ActivityForm({ activityTypes, people, users, households, activity }: { activityTypes: ActivityOption[]; people: PersonOption[]; users: UserOption[]; households: HouseholdOption[]; activity?: ActivityValues }) {
  const [state, formAction, pending] = useActionState(activity ? updateActivity : createActivity, initialState);

  return (
    <form className="activity-form" action={formAction}>
      {activity && <input type="hidden" name="activityId" value={activity.id} />}
      <div className="activity-form-grid">
        <label>
          Tipo de actividad
          <select name="activityTypeId" defaultValue={activity?.activityTypeId ?? ""} required>
            <option value="" disabled>Seleccioná una opción</option>
            {activityTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.code} · {type.name}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha y hora
          <input name="scheduledAt" type="datetime-local" defaultValue={activity?.scheduledAt ?? ""} required />
        </label>
        <label>
          Acompañantes
          <select className="activity-multi-select" name="companionUserIds" multiple defaultValue={activity?.companionUserIds ?? []}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <small className="activity-field-help">Podés seleccionar uno o más usuarios.</small>
        </label>
        <label>
          Siervos externos
          <input name="externalCompanions" type="text" defaultValue={activity?.externalCompanions ?? ""} placeholder="Ej. José Pérez, Ana Gómez" />
        </label>
        <label>
          Hogar a visitar
          <select name="scHouseholdId" defaultValue={activity?.scHouseholdId ?? ""} required>
            <option value="" disabled>Seleccioná un hogar registrado</option>
            {households.map((household) => (
              <option key={household.id} value={household.id}>{household.name}{household.address ? ` · ${household.address}` : ""}</option>
            ))}
          </select>
        </label>
        <label className="activity-form-wide">
          Notas
          <textarea name="notes" defaultValue={activity?.notes ?? ""} placeholder="Agregá información útil para el equipo" maxLength={1000} rows={4} />
        </label>
        <label className="activity-completed-option activity-form-wide">
          <input type="checkbox" name="completed" />
          <span>Actividad realizada</span>
        </label>
      </div>

      {state.error && <p className="form-message form-message-error" role="alert">{state.error}</p>}
      <div className="activity-form-actions">
        <a className="activity-cancel" href="/dashboard">Cancelar</a>
        <button className="submit-button activity-submit" type="submit" disabled={pending}>
          {pending ? "Guardando..." : activity ? "Guardar cambios" : "Guardar actividad"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
