// app/panel/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { logout } from "@/lib/auth";
import {
  User,
  onAuthStateChanged,
} from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";

type Photo = {
  id: string;
  imageUrl: string;
  slug: string;
  priceView: number;
  priceDownload: number;
  earningsView?: number;
  earningsDownload?: number;
  purchasesView?: number;
  purchasesDownload?: number;
};

export default function CreatorPanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [priceView, setPriceView] = useState<number>(100);
  const [priceDownload, setPriceDownload] = useState<number>(130);

  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // 👉 Revisar sesión del usuario
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (!current) {
        setUser(null);
        setCheckingAuth(false);
        router.push("/login");
      } else {
        setUser(current);
        setCheckingAuth(false);
        loadPhotos(current.uid);
      }
    });

    return () => unsub();
  }, [router]);

  // 👉 Cargar fotos del creador
  async function loadPhotos(userId: string) {
    try {
      setLoadingPhotos(true);
      const q = query(
        collection(db, "photos"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const list: Photo[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          imageUrl: data.imageUrl,
          slug: data.slug ?? "",
          priceView: data.priceView ?? 0,
          priceDownload: data.priceDownload ?? 0,
          earningsView: data.earningsView ?? 0,
          earningsDownload: data.earningsDownload ?? 0,
          purchasesView: data.purchasesView ?? 0,
          purchasesDownload: data.purchasesDownload ?? 0,
        };
      });
      setPhotos(list);
    } catch (err) {
      console.error("Error cargando fotos:", err);
    } finally {
      setLoadingPhotos(false);
    }
  }

  // 👉 Totales de ganancias
  const totals = useMemo(() => {
    const totalEarnings = photos.reduce(
      (sum, p) =>
        sum + (p.earningsView ?? 0) + (p.earningsDownload ?? 0),
      0
    );
    const totalViews = photos.reduce(
      (sum, p) => sum + (p.purchasesView ?? 0),
      0
    );
    const totalDownloads = photos.reduce(
      (sum, p) => sum + (p.purchasesDownload ?? 0),
      0
    );
    return { totalEarnings, totalViews, totalDownloads };
  }, [photos]);

  // 👉 Manejar subida de foto (Cloudinary + Firestore)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    if (!file) {
      setFormError("Selecciona una foto.");
      return;
    }

    if (!slug.trim()) {
      setFormError("Escribe un slug (ej. dani3).");
      return;
    }

    setFormError("");
    setSuccessMessage("");
    setUploading(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Faltan variables de entorno de Cloudinary. Revisa .env.local"
        );
      }

      // 1) Subir la imagen a Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Error al subir la imagen a Cloudinary.");
      }

      const data = await res.json();
      const imageUrl = data.secure_url as string;

      // 2) Guardar en Firestore
      const docRef = await addDoc(collection(db, "photos"), {
        userId: user.uid,
        creatorEmail: user.email ?? null,
        imageUrl,
        slug: slug.trim(),
        priceView,
        priceDownload,
        earningsView: 0,
        earningsDownload: 0,
        purchasesView: 0,
        purchasesDownload: 0,
        createdAt: new Date(),
      });

      // 3) Actualizar UI sin recargar
      const newPhoto: Photo = {
        id: docRef.id,
        imageUrl,
        slug: slug.trim(),
        priceView,
        priceDownload,
        earningsView: 0,
        earningsDownload: 0,
        purchasesView: 0,
        purchasesDownload: 0,
      };

      setPhotos((prev) => [newPhoto, ...prev]);

      // Reset formulario
      setFile(null);
      const inputFile = document.getElementById(
        "photo-input"
      ) as HTMLInputElement | null;
      if (inputFile) inputFile.value = "";
      setSlug("");
      setPriceView(100);
      setPriceDownload(130);
      setSuccessMessage("Foto subida y lista para compartir ✅");
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Error al subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  // 👉 Eliminar foto
  async function handleDeletePhoto(photoId: string) {
    const ok = window.confirm(
      "¿Seguro que quieres eliminar esta foto? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "photos", photoId));
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Error al eliminar la foto:", err);
      alert("No se pudo eliminar la foto. Intenta de nuevo.");
    }
  }

  // 👉 Cerrar sesión
  async function handleLogout() {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      alert("No se pudo cerrar sesión. Intenta de nuevo.");
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando sesión...
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-400 flex items-center justify-center text-slate-900 font-black text-lg">
              MF
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-[0.25em]">
                Panel de creador
              </span>
              <span className="font-semibold text-sm sm:text-base">
                Bienvenido, {user.email || "creador"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
            >
              Ir al inicio
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-semibold hover:bg-red-400 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* RESUMEN GANANCIAS */}
        <section className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-400/60 bg-slate-900/80 p-3 flex flex-col">
            <span className="text-[11px] text-gray-400 mb-1">
              Ganancias totales
            </span>
            <span className="text-lg font-bold text-emerald-300">
              ${totals.totalEarnings} MXN
            </span>
            <span className="text-[10px] text-gray-500 mt-1">
              Suma de vistas y descargas de todas tus fotos.
            </span>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 flex flex-col">
            <span className="text-[11px] text-gray-400 mb-1">
              Vistas pagadas
            </span>
            <span className="text-lg font-semibold text-gray-100">
              {totals.totalViews}
            </span>
            <span className="text-[10px] text-gray-500 mt-1">
              Veces que se ha desbloqueado para ver.
            </span>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 flex flex-col">
            <span className="text-[11px] text-gray-400 mb-1">
              Descargas pagadas
            </span>
            <span className="text-lg font-semibold text-gray-100">
              {totals.totalDownloads}
            </span>
            <span className="text-[10px] text-gray-500 mt-1">
              Veces que se pagó por descargar.
            </span>
          </div>
        </section>

        {/* FORMULARIO SUBIR FOTO + RESUMEN */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-semibold mb-3">
              Subir nueva foto
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Sube una foto, ponle precio y genera un enlace único para
              compartir.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Archivo de la foto
                </label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                  }}
                  className="w-full text-xs text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-400 file:text-slate-900 hover:file:bg-emerald-300 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Slug / ID público (ej. dani3)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="dani3, daniela-foto-01, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Precio para ver (MXN)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceView}
                    onChange={(e) => setPriceView(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Precio para descargar (MXN)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={priceDownload}
                    onChange={(e) =>
                      setPriceDownload(Number(e.target.value))
                    }
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              {successMessage && (
                <p className="text-xs text-emerald-300">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="mt-2 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploading ? "Subiendo foto..." : "Subir y generar enlace"}
              </button>
            </form>
          </div>

          {/* RESUMEN TEXTO */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold mb-3">
                Cómo funciona tu panel
              </h2>
              <p className="text-xs text-gray-300 mb-2">
                Cada foto tiene su propio enlace del tipo:
              </p>
              <p className="text-xs bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 font-mono text-gray-200">
                /mi-foto/&lt;tu-slug&gt;
              </p>
              <p className="mt-3 text-[11px] text-gray-400">
                Ejemplo: si usas el slug{" "}
                <span className="text-emerald-300 font-mono">
                  dani3
                </span>
                , el enlace será:
                <br />
                <span className="text-gray-200 font-mono">
                  http://localhost:3000/mi-foto/dani3
                </span>
              </p>
              <p className="mt-3 text-[11px] text-gray-400">
                Tus ganancias se actualizan cuando un comprador desbloquea
                para ver o descargar (simulado por ahora, sin pago real).
              </p>
            </div>
          </div>
        </section>

        {/* LISTA DE FOTOS */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              Tus fotos en venta
            </h2>
          </div>

          {loadingPhotos ? (
            <p className="text-xs text-gray-400">Cargando fotos...</p>
          ) : photos.length === 0 ? (
            <p className="text-xs text-gray-400">
              Aún no has subido fotos. Sube la primera usando el
              formulario de arriba.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => {
                const publicUrl = `/mi-foto/${photo.slug || photo.id}`;
                const totalEarningsPhoto =
                  (photo.earningsView ?? 0) +
                  (photo.earningsDownload ?? 0);

                return (
                  <div
                    key={photo.id}
                    className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 flex flex-col gap-2 text-xs"
                  >
                    <div className="relative rounded-lg overflow-hidden bg-slate-800 h-32 mb-1">
                      <img
                        src={photo.imageUrl}
                        alt={photo.slug}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <p className="text-[11px] text-gray-400">
                      Slug:{" "}
                      <span className="text-gray-200 font-mono">
                        {photo.slug || photo.id}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Ver:{" "}
                      <span className="text-emerald-300 font-semibold">
                        ${photo.priceView} MXN
                      </span>{" "}
                      · Descargar:{" "}
                      <span className="text-emerald-300 font-semibold">
                        ${photo.priceDownload} MXN
                      </span>
                    </p>

                    <p className="text-[11px] text-gray-400">
                      Ganado:{" "}
                      <span className="text-emerald-300 font-semibold">
                        ${totalEarningsPhoto} MXN
                      </span>{" "}
                      <span className="text-[10px] text-gray-500">
                        (ver + descargar)
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Vistas pagadas: {photo.purchasesView ?? 0} · Descargas
                      pagadas: {photo.purchasesDownload ?? 0}
                    </p>

                    <p className="text-[11px] text-gray-400 break-all">
                      Enlace público:
                      <br />
                      <span className="text-gray-200 font-mono">
                        {publicUrl}
                      </span>
                    </p>

                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              window.location.origin + publicUrl
                            );
                            alert(
                              "Enlace copiado al portapapeles ✅"
                            );
                          } catch {
                            alert(
                              "No se pudo copiar el enlace. Cópialo manualmente."
                            );
                          }
                        }}
                        className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-emerald-400 text-slate-900 font-semibold hover:bg-emerald-300 transition"
                      >
                        Copiar enlace
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-red-500/80 text-red-300 font-semibold hover:bg-red-500/10 transition"
                      >
                        Eliminar foto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
