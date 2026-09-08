import Image from "next/image";
import { LoginForm } from "./login-form";

export default function Home() {
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

          <LoginForm />
          <p className="form-footer">Iglesia Carapachay <span>·</span> Sistema interno</p>
        </div>
      </section>
    </main>
  );
}
