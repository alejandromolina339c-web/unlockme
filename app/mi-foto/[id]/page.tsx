"use client";

import { useEffect, useState } from "react";
import {
  useSearchParams,
  useParams,
  useRouter,
} from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from "firebase/firestore";

type PhotoDoc = {
  id: string;
  imageUrl: string;
  slug?: string;
  title?: string;
  priceView?: number;
  priceDownload?: number;
  userId?: string;
  creatorEmail?: string | null;
};

type CreatorProfile = {
  displayName?: string;
  avatarUrl?: string;
};

const UNLOCK_STORAGE_PREFIX = "unlockme_unlocked_";

export default function PhotoBuyerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const slugOrId = params?.id;

  const [photo, setPhoto] = useState<PhotoDoc | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);

  // 1️⃣ Cargar la foto desde Firestore (por slug o por id)
  useEffect(() => {
    if (!slugOrId) return;

    let cancelled = false;

    async function loadPhoto() {
      try {
        setLoading(true);
        setNotFound(false);
        setErrorMessage(null);

        // Buscar por slug
        const photosRef = collection(db, "photos");
        const slugQuery = query(photosRef, where("slug", "==", slugOrId));
        const slugSnap = await getDocs(slugQuery);

        let photoSnap = slugSnap.docs[0] || null;

        // Si no hay por slug, probar por id de documento
        if (!photoSnap) {
          const byIdRef = doc(db, "photos", slugOrId);
          const byIdSnap = await getDoc(byIdRef);
          if (byIdSnap.exists()) {
            photoSnap = byIdSnap;
          }
        }

        if (!photoSnap) {
          if (!cancelled) {
            setNotFound(true);
            setPhoto(null);
          }
          return;
        }

        const data = photoSnap.data() as {
          imageUrl?: string;
          slug?: string;
          title?: string;
          priceView?: number;
          priceDownload?: number;
          userId?: string;
          creatorEmail?: string | null;
          [key: string]: unknown;
        };

        const fullPhoto: PhotoDoc = {
          id: photoSnap.id,
          imageUrl: String(data.imageUrl ?? ""),
          slug: data.slug,
          title: data.title,
          priceView:
            typeof data.priceView === "number" ? data.priceView : undefined,
          priceDownload:
            typeof data.priceDownload === "number"
              ? data.priceDownload
              : undefined,
          userId: data.userId,
          creatorEmail: data.creatorEmail ?? null,
        };

        if (!cancelled) {
          setPhoto(fullPhoto);

          // Intentar cargar perfil del creador si hay userId
          if (fullPhoto.userId) {
            const userRef = doc(db, "users", fullPhoto.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && !cancelled) {
              const uData = userSnap.data() as CreatorProfile;
              setCreator({
                displayName: uData.displayName,
                avatarUrl: uData.avatarUrl,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error cargando la foto:", err);
        if (!cancelled) {
          setErrorMessage(
            "No se pudo cargar la foto. Intenta de nuevo más tarde."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  // 2️⃣ Manejar desbloqueo (después de pagar o si ya estaba desbloqueada en este navegador)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!slugOrId) return;

    const storageKey = `${UNLOCK_STORAGE_PREFIX}${slugOrId}`;
    const status = searchParams.get("status");
    const stored = window.localStorage.getItem(storageKey);

    // Si venimos de un pago exitoso
    if (status === "success") {
      if (stored !== "1") {
        window.localStorage.setItem(storageKey, "1");
      }
      
      
      setIsUnlocked(true);
      return;
    }

    // Si ya estaba desbloqueada antes en este navegador
    if (stored === "1") {
      
      setIsUnlocked(true);
    }
  }, [searchParams, slugOrId]);

  // 3️⃣ Iniciar checkout con Mercado Pago
  async function handleCheckout() {
    if (!photo || !slugOrId) return;

    try {
      setLoadingCheckout(true);
      setErrorMessage(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId: slugOrId,
          mode: "view",
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.url) {
        setErrorMessage(
          data?.error || "No se pudo iniciar el pago. Intenta de nuevo."
        );
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Error iniciando checkout:", err);
      setErrorMessage(
        "Error al conectar con la pasarela de pago. Intenta nuevamente."
      );
    } finally {
      setLoadingCheckout(false);
    }
  }

  // 4️⃣ Reportar contenido
  async function handleReport() {
    if (!photo) return;

    try {
      const reportsRef = collection(db, "reports");
      await addDoc(reportsRef, {
        photoId: photo.id,
        slug: photo.slug ?? null,
        creatorId: photo.userId ?? null,
        createdAt: new Date(),
        reason: "Reporte desde la página pública",
      });
      setReportSent(true);
    } catch (err) {
      console.error("Error al enviar reporte:", err);
      alert("No se pudo enviar el reporte. Intenta de nuevo.");
    }
  }

  // 5️⃣ Render

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Cargando foto...
      </main>
    );
  }

  if (notFound || !photo) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <p className="mb-4">Foto no encontrada o ya no está disponible.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 transition"
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  const displayName =
    creator?.displayName || photo.creatorEmail || "Creador de UnlockMe";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* HEADER SIMPLE */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-sm font-semibold">
              {creator?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{displayName}</span>
              <span className="text-[11px] text-gray-400">
                Contenido premium en UnlockMe
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
          >
            Volver al inicio
          </button>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold mb-1">
              {photo.title || "Foto premium"}
            </h1>
            <p className="text-xs text-gray-400">
              No necesitas cuenta. Pagas una sola vez y desbloqueas esta foto
              en este dispositivo.
            </p>
          </div>

          {/* Imagen / preview */}
          <div className="relative rounded-xl overflow-hidden bg-slate-800 h-80 sm:h-96">
            
            <img
              src={photo.imageUrl}
              alt={photo.title || "Foto premium"}
              className={`w-full h-full object-cover transition duration-500 ${
                isUnlocked ? "" : "blur-xl scale-105"
              }`}
            />

            {!isUnlocked && (
              <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm text-gray-100 mb-2">
                  Foto premium bloqueada
                </p>
                <p className="text-xs text-gray-300 mb-3">
                  Desbloquea para ver la imagen completa en alta calidad.
                </p>
                <span className="inline-flex items-center rounded-full bg-black/40 border border-emerald-300/60 px-3 py-1 text-[11px] text-emerald-200">
                  ${photo.priceView ?? 0} MXN · pago único
                </span>
              </div>
            )}
          </div>

          {/* Mensajes de error */}
          {errorMessage && (
            <p className="text-xs text-red-400">{errorMessage}</p>
          )}

          {/* Botón de pago */}
          {!isUnlocked && (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loadingCheckout}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingCheckout ? "Abriendo pago..." : "Desbloquear foto"}
            </button>
          )}

          {isUnlocked && (
            <p className="text-xs text-emerald-300">
              ✅ Foto desbloqueada en este dispositivo.
            </p>
          )}

          {/* Botón de reporte */}
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReport}
              disabled={reportSent}
              className="text-[11px] text-red-300 underline underline-offset-2 disabled:opacity-60"
            >
              {reportSent ? "Reporte enviado. Gracias." : "Reportar contenido"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
