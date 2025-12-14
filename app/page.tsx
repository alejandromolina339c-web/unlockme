"use client";

import { useEffect } from "react";
import Link from "next/link";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

:root { --mx: 50%; --my: 20%; }

@keyframes unlockmeGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes blobFloat1 {
  0% { transform: translate3d(-10%, -10%, 0) scale(1); }
  50% { transform: translate3d(10%, 8%, 0) scale(1.08); }
  100% { transform: translate3d(-10%, -10%, 0) scale(1); }
}
@keyframes blobFloat2 {
  0% { transform: translate3d(12%, -6%, 0) scale(1); }
  50% { transform: translate3d(-10%, 10%, 0) scale(1.12); }
  100% { transform: translate3d(12%, -6%, 0) scale(1); }
}
@keyframes blobFloat3 {
  0% { transform: translate3d(0%, 12%, 0) scale(1); }
  50% { transform: translate3d(-8%, -10%, 0) scale(1.1); }
  100% { transform: translate3d(0%, 12%, 0) scale(1); }
}

.unlockme-animated-bg {
  background: linear-gradient(
    120deg,
    rgba(255, 0, 200, 0.55),
    rgba(160, 60, 255, 0.55),
    rgba(0, 210, 255, 0.55),
    rgba(0, 255, 170, 0.40),
    rgba(255, 0, 200, 0.55)
  );
  background-size: 260% 260%;
  animation: unlockmeGradient 10s ease-in-out infinite;
}

.unlockme-font {
  font-family: "Outfit", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
}

.unlockme-logo {
  letter-spacing: -0.02em;
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.12),
    0 0 36px rgba(160, 60, 255, 0.22),
    0 0 64px rgba(0, 210, 255, 0.18);
}

.unlockme-logo-gradient {
  background: linear-gradient(90deg, rgba(255,255,255,0.95), rgba(196,181,253,0.9), rgba(56,189,248,0.9));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.unlockme-grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  opacity: .12;
}

@media (prefers-reduced-motion: reduce) {
  .unlockme-animated-bg { animation: none; }
  .unlockme-blob1, .unlockme-blob2, .unlockme-blob3 { animation: none; }
}
`;

export default function Home() {
  function handleSupportClick() {
    if (typeof window !== "undefined") {
      window.location.href = "mailto:soportemx74@gmail.com";
    }
  }

  // Spotlight interactivo (mouse/touch)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const x = Math.max(0, Math.min(1, e.clientX / w));
      const y = Math.max(0, Math.min(1, e.clientY / h));
      document.documentElement.style.setProperty("--mx", `${x * 100}%`);
      document.documentElement.style.setProperty("--my", `${y * 100}%`);
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <main className="unlockme-font relative min-h-screen overflow-hidden text-white bg-[#05060a]">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Fondo “Euphoria”: gradiente animado + blobs + spotlight + grain */}
      <div className="pointer-events-none absolute inset-0">
        {/* Base animada */}
        <div className="absolute inset-0 unlockme-animated-bg opacity-30" />

        {/* Blobs neón */}
        <div
          className="unlockme-blob1 absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,0,200,0.85), transparent 60%)",
            animation: "blobFloat1 10s ease-in-out infinite",
          }}
        />
        <div
          className="unlockme-blob2 absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full blur-3xl opacity-45"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(0,210,255,0.9), transparent 60%)",
            animation: "blobFloat2 12s ease-in-out infinite",
          }}
        />
        <div
          className="unlockme-blob3 absolute -bottom-52 left-1/4 h-[640px] w-[640px] rounded-full blur-3xl opacity-35"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(0,255,170,0.75), transparent 62%)",
            animation: "blobFloat3 14s ease-in-out infinite",
          }}
        />

        {/* Spotlight que sigue cursor */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 520px at var(--mx) var(--my), rgba(255,255,255,0.20), transparent 60%)",
          }}
        />

        {/* Viñeta / profundidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/85" />

        {/* Grain */}
        <div className="absolute inset-0 unlockme-grain" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6 flex flex-col gap-10">
        {/* Header minimal (logo texto en esquina + botones) */}
        <header className="flex items-center justify-between">
          {/* “UnlockMe” en la esquina */}
          <div className="select-none">
            <span className="unlockme-logo unlockme-logo-gradient text-3xl sm:text-4xl font-light">
              UnlockMe
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full border border-white/15 bg-white/5 text-sm text-white/90 hover:bg-white/10 transition"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/register"
              className="px-4 py-2 rounded-full border border-white/15 bg-white/10 text-sm text-white font-semibold hover:bg-white/15 transition"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        {/* HERO centrado */}
        <section className="flex flex-col items-center text-center gap-5 mt-8 sm:mt-12">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
            Vende tus fotos con un link.
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-2xl">
            Sube una foto, ponle precio y compártela. Tus fans desbloquean sin crear cuenta.
          </p>

          <div className="flex items-center justify-center gap-3 mt-2">
            <Link
              href="/register"
              className="px-7 py-3 rounded-full font-semibold text-sm text-white
                         border border-white/15 bg-white/10 hover:bg-white/15 transition
                         shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            >
              Empezar como creador
            </Link>
          </div>
        </section>

        {/* Bloque de imagen grande */}
        <section className="mt-4 sm:mt-8">
          <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur-md overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            <div className="relative h-[360px] sm:h-[440px] md:h-[520px]">
              {/* ✅ ÚNICO CAMBIO: reemplazamos placeholder por la imagen de /public */}
              <img
  src="/hero.png"
  alt="UnlockMe hero"
  className="absolute inset-0 h-full w-full object-cover object-[50%_35%]"

/>

              {/* Overlay suave para que se sienta premium con el fondo */}
              <div className="absolute inset-0 bg-black/20" />
            </div>
          </div>
        </section>

        {/* Secciones abajo, ordenadas */}
        <section className="mt-2 grid md:grid-cols-2 gap-4">
          <div
            id="como-funciona"
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
          >
            <h2 className="text-lg font-semibold">Cómo funciona</h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">
              1) Te registras como creador. <br />
              2) Subes una foto y defines un precio. <br />
              3) Se genera un enlace único. <br />
              4) Lo compartes por donde quieras. <br />
              5) Tus fans pagan y desbloquean sin crear cuenta.
            </p>
          </div>

          <div
            id="creadores"
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
          >
            <h2 className="text-lg font-semibold">Creadores</h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">
              Para fotógrafos, modelos, artistas y creadores visuales que quieren monetizar
              sin complicaciones.
            </p>
          </div>

          <div
            id="soporte"
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
          >
            <h2 className="text-lg font-semibold">Soporte</h2>
            <p className="mt-2 text-sm text-white/75">
              ¿Necesitas ayuda? Escríbenos y te respondemos lo antes posible.
            </p>
            <button
              onClick={handleSupportClick}
              className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full
                         border border-white/15 bg-white/10 hover:bg-white/15 transition text-sm font-semibold"
            >
              Contactar soporte
            </button>
          </div>

          <div
            id="terminos"
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5"
          >
            <h2 className="text-lg font-semibold">Términos</h2>
            <p className="mt-2 text-sm text-white/75">
              Contenido legal (18+), consentimiento y reglas claras.
            </p>
            <Link
              href="/terminos"
              className="mt-4 inline-flex items-center justify-center px-5 py-2.5 rounded-full
                         border border-white/15 bg-white/10 hover:bg-white/15 transition text-sm font-semibold"
            >
              Ver términos de uso
            </Link>
          </div>
        </section>

        <footer className="pt-6 pb-10 text-center text-xs text-white/45">
          © {new Date().getFullYear()} UnlockMe · México
        </footer>
      </div>
    </main>
  );
}
