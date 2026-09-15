"use client";

import { useActionState, useMemo } from "react";

import {
  confirmHouseholdImport,
  previewHouseholdImport,
  type HouseholdImportConfirmState,
  type HouseholdImportPreviewState,
} from "../../household-import-actions";

const emptyPreview: HouseholdImportPreviewState = { errors: [], groups: [] };

export function HouseholdImportForm() {
  const [preview, previewAction, previewPending] = useActionState(previewHouseholdImport, emptyPreview);
  const [confirmState, confirmAction, confirmPending] = useActionState<HouseholdImportConfirmState, FormData>(
    confirmHouseholdImport,
    {},
  );

  const hasPreview = preview !== emptyPreview && (preview.groups.length > 0 || preview.errors.length > 0);

  const totals = useMemo(() => {
    const newHouseholds = preview.groups.filter((group) => !group.existingHouseholdId).length;
    const existingHouseholds = preview.groups.length - newHouseholds;
    const newMembers = preview.groups.reduce(
      (sum, group) => sum + group.members.filter((member) => !member.alreadyExists).length,
      0,
    );
    return { newHouseholds, existingHouseholds, newMembers };
  }, [preview.groups]);

  const groupsJson = useMemo(() => JSON.stringify(preview.groups), [preview.groups]);

  return (
    <div className="household-import">
      <form className="activity-form household-import-form" action={previewAction}>
        <div className="activity-form-grid">
          <label className="activity-form-wide">
            Archivo Excel (.xlsx)
            <input name="file" type="file" accept=".xlsx,.xls" required />
          </label>
        </div>
        <div className="activity-form-actions">
          <button className="submit-button activity-submit" type="submit" disabled={previewPending}>
            {previewPending ? "Analizando..." : "Previsualizar"}
          </button>
        </div>
      </form>

      {hasPreview && (
        <section className="household-import-preview" aria-labelledby="import-preview-title">
          <h2 id="import-preview-title">Previsualización</h2>

          {preview.groups.length > 0 && (
            <p className="household-import-summary">
              {totals.newHouseholds} hogar(es) nuevo(s), {totals.existingHouseholds} hogar(es) existente(s) a los que se les
              agregarán integrantes, {totals.newMembers} integrante(s) nuevo(s) en total.
            </p>
          )}

          {preview.errors.length > 0 && (
            <div className="household-import-errors">
              <p><strong>{preview.errors.length}</strong> fila(s) con problemas (no se van a importar):</p>
              <ul>
                {preview.errors.map((error, index) => (
                  <li key={index}>Fila {error.row || "-"}: {error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.groups.length > 0 && (
            <>
              <div className="household-import-groups">
                {preview.groups.map((group, groupIndex) => (
                  <article className="household-import-group" key={groupIndex}>
                    <header>
                      <h3>{group.name}</h3>
                      <span className={`household-import-tag ${group.existingHouseholdId ? "household-import-tag-existing" : "household-import-tag-new"}`}>
                        {group.existingHouseholdId ? "Hogar existente" : "Hogar nuevo"}
                      </span>
                    </header>
                    <ul className="household-import-members">
                      {group.members.map((member, memberIndex) => (
                        <li key={memberIndex} className={member.alreadyExists ? "household-import-member-existing" : undefined}>
                          {member.firstName} {member.lastName}
                          {member.alreadyExists ? " (ya existe, no se duplica)" : ""}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              <form action={confirmAction}>
                <input type="hidden" name="groups" value={groupsJson} />
                <div className="activity-form-actions">
                  <button className="submit-button activity-submit" type="submit" disabled={confirmPending}>
                    {confirmPending ? "Importando..." : "Confirmar importación"}
                  </button>
                </div>
              </form>
            </>
          )}

          {confirmState.error && <p className="household-import-error">{confirmState.error}</p>}
        </section>
      )}
    </div>
  );
}
