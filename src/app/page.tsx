"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("El acceso estará disponible cuando conectemos la autenticación.");
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-orbit brand-orbit-one" />
        <div className="brand-orbit brand-orbit-two" />
        <div className="brand-content">
          <Image className="brand-logo" src="/inasud-logo.png" alt="Iglesia Nueva Apostólica Sud América" width={512} height={168} priority />
          <div className="brand-copy">
            <p className="brand-kicker">INAVAE · CARAPACHAY</p>
            <h1>Una comunidad que se organiza para servir.</h1>
            <p>Planificá visitas, actividades y encuentros con una mirada clara sobre cada persona.</p>
          </div>
          <div className="brand-verse">
            <span>“</span>
            <p>Todo hágase decentemente y con orden.</p>
            <small>1 Corintios 14:40</small>
          </div>
        </div>
      </section>

      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <div className="mobile-mark">INAVAE <span>•</span> CARAPACHAY</div>
          <div className="form-heading">
            <p className="eyebrow">Bienvenido de nuevo</p>
            <h2 id="login-title">Iniciar sesión</h2>
            <p>Ingresá para continuar con la gestión de la iglesia.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" placeholder="nombre@ejemplo.com" autoComplete="email" required />

            <div className="password-label-row">
              <label htmlFor="password">Contraseña</label>
              <button type="button" className="text-button" onClick={() => setMessage("La recuperación de contraseña se habilitará próximamente.")}>¿Olvidaste tu contraseña?</button>
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

            <button type="submit" className="submit-button">Ingresar <span aria-hidden="true">→</span></button>
            {message && <p className="form-message" role="status">{message}</p>}
          </form>
          <p className="form-footer">Iglesia Carapachay <span>·</span> Sistema interno</p>
        </div>
      </section>
    </main>
  );
}
