// app/panel/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { logout } from "@/lib/auth";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getDoc, // ✅ nuevo (solo para leer el perfil)
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
  createdAt?: Date;
};

interface PhotoDoc {
  userId: string;
  imageUrl: string;
  slug?: string;
  priceView?: number;
  priceDownload?: number;
  earningsView?: number;
  earningsDownload?: number;
  purchasesView?: number;
  purchasesDownload?: number;
  createdAt?: { seconds: number; nanoseconds: number } | Date;
  creatorName?: string;
  creatorAvatarUrl?: string;
}

export default function CreatorPanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [priceView, setPriceView] = useState<number>(100);
  const [priceDownload, setPriceDownload] = useState<number>(130); // se mantiene, pero NO se muestra en UI

  const MIN_PRICE = 70;

  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // ✅ Perfil para header (NO correo)
  const [profileName, setProfileName] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string>("");

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
        void loadUserProfile(current.uid); // ✅ nuevo
        void loadPhotos(current.uid);
      }
    });

    return () => unsub();
  }, [router]);

  // ✅ Cargar perfil del creador (displayName + avatarUrl)
  async function loadUserProfile(userId: string) {
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as { displayName?: string; avatarUrl?: string };
        setProfileName((data.displayName ?? "").trim());
        setProfileAvatar((data.avatarUrl ?? "").trim());
      } else {
        setProfileName("");
        setProfileAvatar("");
      }
    } catch (e) {
      console.error("Error cargando perfil:", e);
      setProfileName("");
      setProfileAvatar("");
    }
  }

  // 👉 Cargar fotos del creador
  async function loadPhotos(userId: string) {
    try {
      setLoadingPhotos(true);
      const q = query(collection(db, "photos"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const list: Photo[] = snap.docs.map((d) => {
        const data = d.data() as PhotoDoc;

        let createdAt: Date | undefined;
        if (data.createdAt instanceof Date) {
          createdAt = data.createdAt;
        } else if (data.createdAt && "seconds" in data.createdAt) {
          createdAt = new Date(data.createdAt.seconds * 1000);
        }

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
          createdAt,
        };
      });
      setPhotos(list);
    } catch (error) {
      console.error("Error cargando fotos:", error);
    } finally {
      setLoadingPhotos(false);
    }
  }

  // 👉 Totales de ganancias
  const totals = useMemo(() => {
    const totalEarnings = photos.reduce(
      (sum, p) => sum + (p.earningsView ?? 0) + (p.earningsDownload ?? 0),
      0
    );
    const totalViews = photos.reduce((sum, p) => sum + (p.purchasesView ?? 0), 0);
    const totalDownloads = photos.reduce(
      (sum, p) => sum + (p.purchasesDownload ?? 0),
      0
    );
    return { totalEarnings, totalViews, totalDownloads };
  }, [photos]);

  // 👉 Manejar subida de foto (Cloudinary + Firestore)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        throw new Error("Faltan variables de entorno de Cloudinary. Revisa .env.local");
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

      const data: { secure_url?: string } = await res.json();
      if (!data.secure_url) {
        throw new Error("Cloudinary no devolvió una URL de imagen.");
      }
      const imageUrl = data.secure_url;

      // 2) Guardar en Firestore
      const now = new Date();

      const docRef = await addDoc(collection(db, "photos"), {
        userId: user.uid,
        creatorEmail: user.email ?? null,
        imageUrl,
        slug: slug.trim(),
        priceView,
        priceDownload, // se mantiene
        earningsView: 0,
        earningsDownload: 0,
        purchasesView: 0,
        purchasesDownload: 0,
        createdAt: now,
      });

      // 3) Actualizar UI sin recargar
      const newPhoto: Photo = {
        id: docRef.id,
        imageUrl,
        slug: slug.trim(),
        priceView,
        priceDownload, // se mantiene
        earningsView: 0,
        earningsDownload: 0,
        purchasesView: 0,
        purchasesDownload: 0,
        createdAt: now,
      };

      setPhotos((prev) => [newPhoto, ...prev]);

      // Reset formulario
      setFile(null);
      const inputFile = document.getElementById("photo-input") as HTMLInputElement | null;
      if (inputFile) inputFile.value = "";
      setSlug("");
      setPriceView(100);
      setPriceDownload(130); // se mantiene
      setSuccessMessage("Foto subida y lista para compartir ✅");
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Error al subir la foto.";
      setFormError(msg);
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
    } catch (error) {
      console.error("Error al eliminar la foto:", error);
      alert("No se pudo eliminar la foto. Intenta de nuevo.");
    }
  }

  // 👉 Cerrar sesión
  async function handleLogout() {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
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

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-8">
        {/* HEADER SUPERIOR */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* ✅ Avatar (si no hay, fallback U) */}
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt="Avatar del creador"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-emerald-400 flex items-center justify-center text-slate-900 font-black text-lg">
                  U
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">
                Panel de creador
              </span>
              {/* ✅ SOLO nombre, NUNCA correo */}
              <span className="font-semibold text-sm sm:text-base">
                Bienvenido, {profileName || "Creador"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] sm:text-xs text-gray-200 hover:bg-slate-800 transition"
            >
              Ir al inicio
            </button>

            <button
              onClick={() => router.push("/panel/ajustes")}
              className="px-3 py-1.5 rounded-full border border-emerald-500/80 text-[11px] sm:text-xs text-emerald-300 hover:bg-emerald-500/10 transition"
            >
              Ajustes
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-red-500/90 text-white text-[11px] sm:text-xs font-semibold hover:bg-red-400 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* GANANCIAS (ARRIBA) */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-400/60 bg-slate-900/80 p-4 flex flex-col gap-1">
            <span className="text-[11px] text-gray-400">Ganancias totales estimadas</span>
            <span className="text-2xl font-bold text-emerald-300">
              ${totals.totalEarnings} MXN
            </span>
            <span className="text-[11px] text-gray-500">Suma de todas las ganancias de tus fotos.</span>
          </div>
        </section>

        {/* FORMULARIO (ABAJO) */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Subir nueva foto premium</h2>
            <span className="text-[10px] text-gray-500">Solo tú ves este panel</span>
          </div>

          <p className="text-[11px] text-gray-400 mb-4">
            Sube tu foto, define el precio y genera un enlace único para compartir.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Archivo de la foto</label>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                }}
                className="w-full text-xs text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-400 file:text-slate-900 hover:file:bg-emerald-300 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Slug / ID público (ej. dani3)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                placeholder="dani3, daniela-foto-01, etc."
              />
            </div>

            {/* Solo precio para ver (UI) */}
            <div>
              <label className="block text-xs text-gray-300 mb-1">Precio (MXN)</label>
              <input
                type="number"
                min={0}
                value={priceView}
                onChange={(e) => setPriceView(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              />
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            {successMessage && <p className="text-xs text-emerald-300">{successMessage}</p>}

            <button
              type="submit"
              disabled={uploading}
              className="mt-2 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? "Subiendo foto..." : "Subir y generar enlace"}
            </button>
          </form>
        </section>

        {/* LISTA DE FOTOS */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Tus fotos en venta</h2>
            <span className="text-[10px] text-gray-500">Comparte el enlace público con tus fans</span>
          </div>

          {loadingPhotos ? (
            <p className="text-xs text-gray-400">Cargando fotos...</p>
          ) : photos.length === 0 ? (
            <p className="text-xs text-gray-400">
              Aún no has subido fotos. Sube la primera usando el formulario de arriba.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => {
                const publicUrl = `/mi-foto/${photo.slug || photo.id}`;
                const totalEarningsPhoto =
                  (photo.earningsView ?? 0) + (photo.earningsDownload ?? 0);

                return (
                  <div
                    key={photo.id}
                    className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 flex flex-col gap-2 text-xs"
                  >
                    <div className="relative rounded-lg overflow-hidden bg-slate-800 h-32 mb-1">
                      <img
                        src={photo.imageUrl}
                        alt={photo.slug || "Foto del creador"}
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
                      Precio:{" "}
                      <span className="text-emerald-300 font-semibold">
                        ${photo.priceView} MXN
                      </span>
                    </p>

                    <p className="text-[11px] text-gray-400">
                      Ganado:{" "}
                      <span className="text-emerald-300 font-semibold">
                        ${totalEarningsPhoto} MXN
                      </span>
                    </p>

                    <p className="text-[11px] text-gray-400 break-all">
                      Enlace público:
                      <br />
                      <span className="text-gray-200 font-mono">{publicUrl}</span>
                    </p>

                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}${publicUrl}`
                            );
                            alert("Enlace copiado al portapapeles ✅");
                          } catch {
                            alert("No se pudo copiar el enlace. Cópialo manualmente.");
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
