"use client";

import Link from "next/link";

export default function Home() {
  function scrollToSection(id: string) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleSupportClick() {
    if (typeof window !== "undefined") {
      window.location.href = "mailto:soportemx74@gmail.com";
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-10">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dvvohlq4g/image/upload/v1764649731/ChatGPT_Image_1_dic_2025_05_29_12_p.m._cze66m.png"
              alt="UnlockMe"
              className="h-9 w-auto"
            />
          </div>

          {/* Navegación */}
          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <button
              className="hidden sm:inline-flex text-gray-300 hover:text-white transition"
              onClick={() => scrollToSection("creadores")}
            >
              Creadores
            </button>
            <button
              className="hidden sm:inline-flex text-gray-300 hover:text-white transition"
              onClick={() => scrollToSection("como-funciona")}
            >
              Cómo funciona
            </button>

            {/* Soporte: abre correo */}
            <button
              className="hidden sm:inline-flex text-gray-300 hover:text-white transition"
              onClick={handleSupportClick}
            >
              Soporte
            </button>

            {/* Términos de uso */}
            <Link
              href="/terminos"
              className="hidden sm:inline-flex text-gray-300 hover:text-white transition"
            >
              Términos de uso
            </Link>

            <Link
              href="/login"
              className="px-4 py-1 rounded-full text-gray-200 hover:text-white transition"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="px-4 py-1.5 rounded-full bg-emerald-400 text-slate-900 font-semibold hover:bg-emerald-300 transition"
            >
              Sign up
            </Link>
          </nav>
        </header>

        {/* HERO */}
        <section
          id="hero"
          className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mt-4 md:mt-10"
        >
          {/* Lado izquierdo: texto */}
          <div className="space-y-6">
            <p className="text-xs font-semibold tracking-[0.25em] text-emerald-300 uppercase">
              Plataforma para creadores visuales
            </p>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              La nueva forma de{" "}
              <span className="text-emerald-300">vender tus fotos</span>{" "}
              sin complicaciones.
            </h1>

            <p className="text-gray-300 text-sm sm:text-base max-w-xl">
              Sube una foto, ponle precio y comparte tu enlace. Tus
              seguidores desbloquean tu contenido sin crear cuenta. Tú
              controlas qué vendes y cuánto ganas.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-emerald-400 text-slate-900 font-semibold text-sm hover:bg-emerald-300 transition"
              >
                Empezar como creador
              </Link>
              <span className="text-xs text-gray-400 max-w-xs">
                Gratis para empezar. Pensado para fotógrafos, modelos,
                artistas y cualquier persona que quiera monetizar su
                contenido visual sin etiquetas raras.
              </span>
            </div>
          </div>

          {/* Lado derecho: mockup tipo app */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-full max-w-xs sm:max-w-sm">
              {/* Sombra exterior */}
              <div className="absolute -inset-0.5 bg-emerald-400/40 rounded-[2.2rem] blur-xl" />

              {/* “Celular” */}
              <div className="relative rounded-[2rem] bg-slate-900 border border-slate-700/70 px-4 pt-5 pb-6 shadow-2xl">
                {/* Notch */}
                <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-slate-700" />

                {/* Perfil */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-700">
                    {/* Foto de perfil de Daniela */}
                    <img
                      src="/daniela-profile.jpg"
                      alt="Perfil de daniela-fotos"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">daniela-fotos</p>
                    <p className="text-[11px] text-gray-400">
                      Creando contenido visual neutro
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">1.2K</span>
                    <span>Seguidores</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      $30,000
                    </span>
                    <span>Ganado</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">24</span>
                    <span>Fotos</span>
                  </div>
                </div>

                {/* Foto premium bloqueada */}
                <div className="relative overflow-hidden rounded-xl mb-4 bg-slate-800 h-40">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.45),transparent),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.45),transparent)]" />
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-200 mb-1">
                      Foto premium bloqueada
                    </p>
                    <p className="text-[11px] text-gray-300 mb-2 px-4">
                      Desbloquea para ver la imagen completa en alta
                      calidad.
                    </p>
                    <span className="inline-flex items-center rounded-full bg-black/40 border border-emerald-300/60 px-3 py-1 text-[11px] text-emerald-200">
                      $120 MXN · pago único
                    </span>
                  </div>
                </div>

                {/* Botones en el “celular” */}
                <div className="space-y-2">
                  <button className="w-full py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition">
                    Desbloquear foto
                  </button>
                  <button className="w-full py-2 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition">
                    Ver más contenido del creador
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-gray-500 text-center">
                  Simulación de cómo verá tu contenido un comprador.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN CREADORES */}
        <section
          id="creadores"
          className="mt-10 border-t border-white/10 pt-8 space-y-3"
        >
          <h2 className="text-xl font-semibold">
            Creadores que viven de su contenido
          </h2>
          <p className="text-sm text-gray-300 max-w-2xl">
            Imagina una comunidad con más de{" "}
            <span className="font-semibold text-emerald-300">
              30,000 creadores
            </span>{" "}
            que monetizan sus fotos sin depender de marcas, agencias ni
            contratos raros. UnlockMe está diseñado para que puedas subir tu
            contenido visual, ponerle precio y cobrar de forma directa,
            sencilla y transparente.
          </p>
        </section>

        {/* SECCIÓN CÓMO FUNCIONA */}
        <section
          id="como-funciona"
          className="mt-6 space-y-3 mb-10"
        >
          <h2 className="text-xl font-semibold">
            Cómo funciona UnlockMe
          </h2>
          <p className="text-sm text-gray-300 max-w-2xl">
            1. Te registras como creador y verificas tu cuenta. <br />
            2. Subes una foto, escribes un título y decides el precio. <br />
            3. La plataforma genera un enlace único para cada foto. <br />
            4. Compartes ese enlace por donde quieras: redes sociales,
            grupos, mensajes directos. <br />
            5. Tus seguidores pueden desbloquear la foto sin crear cuenta.
            <br />
            6. Recibes el dinero de tus ventas (con la comisión que
            definamos en la plataforma).
          </p>
          <p className="text-xs text-gray-400 max-w-2xl">
            UnlockMe no promete resultados mágicos: la clave está en tu
            comunidad, tu constancia y la calidad de tu contenido. Nuestra
            misión es darte una herramienta simple, moderna y segura para
            convertir tus fotos en ingresos reales.
          </p>
        </section>
      </div>
    </main>
  );
}
