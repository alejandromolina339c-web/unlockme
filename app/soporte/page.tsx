// app/soporte/page.tsx
import Link from "next/link";

export default function SoportePage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Soporte de Mi-Foto</h1>
        <p className="text-sm text-gray-300 mb-3">
          Si tienes dudas, problemas con tu cuenta o ideas para mejorar la
          plataforma, puedes escribirnos.
        </p>
        <p className="text-sm text-gray-200 mb-4">
          Correo de soporte:{" "}
          <a
            href="mailto:soportemx74@mi-foto.app"
            className="text-emerald-300 underline hover:text-emerald-200"
          >
            soportemx74@gmail.com
          </a>
        </p>
        <p className="text-xs text-gray-500 mb-6">
          (Luego puedes cambiar este correo por el que quieras usar de
          forma oficial).
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
