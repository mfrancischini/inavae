"use client";

import { useActionState, useState } from "react";
import { authenticate } from "./actions";

const initialState = { error: "", success: "" };

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(authenticate, initialState);

  return (
    <form className="login-form" action={formAction}>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" placeholder="nombre@ejemplo.com" autoComplete="email" required />

      <div className="password-label-row">
        <label htmlFor="password">Contraseña</label>
        <button type="button" className="text-button">¿Olvidaste tu contraseña?</button>
      </div>
      <div className="password-field">
        <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" required />
        <button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <label className="remember-option">
        <input type="checkbox" name="remember" />
        <span>Recordar este dispositivo</span>
      </label>

      <button type="submit" className="submit-button" disabled={pending}>
        {pending ? "Verificando..." : "Ingresar"} <span aria-hidden="true">→</span>
      </button>
      {state.error && <p className="form-message form-message-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-message" role="status">{state.success}</p>}
    </form>
  );
}
