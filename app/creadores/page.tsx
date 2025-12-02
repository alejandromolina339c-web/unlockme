// app/creadores/page.tsx
import Link from "next/link";

export default function CreadoresPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Creadores en Mi-Foto</h1>
        <p className="text-sm text-gray-300 mb-4">
          Mi-Foto está diseñada para personas que quieren ganar dinero con
          sus fotos: fotógrafos, modelos, artistas o cualquier creador
          visual. Subes tu contenido, defines los precios y compartes tu
          enlace. Nosotros nos encargamos de la parte técnica.
        </p>
        <p className="text-xs text-gray-500 mb-6">
          Esta sección la podemos mejorar más adelante con ejemplos,
          testimonios o una guía rápida para nuevos creadores.
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
