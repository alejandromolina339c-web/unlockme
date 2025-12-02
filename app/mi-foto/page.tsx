// app/mi-foto/page.tsx
export default function MiFotoLanding() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4 text-center">
      <h1 className="text-2xl font-bold mb-3">Mi-Foto</h1>
      <p className="text-sm text-gray-300 mb-4 max-w-md">
        Este enlace está pensado para fotos individuales, del tipo:
        <br />
        <span className="text-emerald-300">
          /mi-foto/ID_DE_LA_FOTO o /mi-foto/tu-slug
        </span>
      </p>
      <p className="text-xs text-gray-400 mb-4 max-w-md">
        Si un creador te compartió una foto, asegúrate de que el enlace tenga
        algo al final, por ejemplo:
        <br />
        <span className="text-gray-200">
          /mi-foto/dani3, /mi-foto/foto-123, etc.
        </span>
      </p>
      <a
        href="/"
        className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition"
      >
        Ir al inicio
      </a>
    </main>
  );
}
