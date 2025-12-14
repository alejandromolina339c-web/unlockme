import Link from "next/link";

export default function MiFotoRootPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Contenido no disponible</h1>
        <p className="text-sm text-gray-300 mb-4">
          Es posible que el enlace esté mal escrito o que falte el ID de la foto
          en la URL.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Asegúrate de usar un enlace del tipo:
          <br />
          <span className="font-mono text-gray-200">
            /mi-foto/&lt;slug-de-la-foto&gt;
          </span>
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
