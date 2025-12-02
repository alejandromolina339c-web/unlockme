// app/como-funciona/page.tsx
import Link from "next/link";

export default function ComoFuncionaPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Cómo funciona Mi-Foto</h1>
        <p className="text-sm text-gray-300 mb-4">
          Mi-Foto es una nueva plataforma web donde los creadores venden
          sus fotos de forma simple y directa. Más de{" "}
          <span className="font-semibold text-emerald-300">
            30,000 usuarios
          </span>{" "}
          ya están generando buenos ingresos compartiendo contenido visual
          sin complicaciones.
        </p>
        <p className="text-sm text-gray-300 mb-4">
          Subes una foto, pones un precio y compartes tu enlace. Tus
          compradores no necesitan crear cuenta: entran al link, ven la
          foto borrosa, pagan para desbloquearla y pueden verla siempre
          desde ese dispositivo. Si quieren, pagan extra para descargarla.
        </p>
        <p className="text-xs text-gray-500 mb-6">
          Nuestra idea es que ganar dinero con tus fotos se sienta tan
          fácil como mandar un mensaje.
        </p>

        <Link
          href="/"
          className="text-xs text-emerald-300 underline hover:text-emerald-200"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
