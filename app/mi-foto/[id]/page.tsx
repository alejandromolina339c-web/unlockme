// app/mi-foto/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useSearchParams,
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
  slug: string;
  imageUrl: string;
  title: string;
  price: number;
  userId: string;
};

type CreatorProfile = {
  displayName?: string;
  avatarUrl?: string | null;
};

export default function PhotoBuyerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const slugOrId = params?.id;

  const [photo, setPhoto] = useState<PhotoDoc | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUnlocked, setIsUnlocked] = useState(false);

  // 👉 Estado para reportes
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  // key para localStorage
  const storageKey = useMemo(() => {
    if (!photo) return null;
    return `unlockme_unlocked_photo_${photo.id}`;
  }, [photo]);

  // 👉 Cargar foto (y luego el perfil del creador)
  useEffect(() => {
    async function loadPhoto() {
      if (!slugOrId) {
        setError("Falta el ID de la foto.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1) Buscar por slug
        const q = query(
          collection(db, "photos"),
          where("slug", "==", slugOrId)
        );
        const snap = await getDocs(q);

        let foundPhoto: PhotoDoc | null = null;

        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data() as any;
          foundPhoto = {
            id: d.id,
            slug: data.slug ?? slugOrId,
            imageUrl: data.imageUrl,
            title: data.title ?? "Foto premium",
            price: data.priceView ?? data.price ?? 0,
            userId: data.userId,
          };
        } else {
          // 2) Si no hay slug, intentamos por ID directo
          const ref = doc(db, "photos", slugOrId);
          const docSnap = await getDoc(ref);
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            foundPhoto = {
              id: docSnap.id,
              slug: data.slug ?? slugOrId,
              imageUrl: data.imageUrl,
              title: data.title ?? "Foto premium",
              price: data.priceView ?? data.price ?? 0,
              userId: data.userId,
            };
          }
        }

        if (!foundPhoto) {
          setError("Foto no encontrada.");
          setLoading(false);
          return;
        }

        setPhoto(foundPhoto);

        // 3) Cargar perfil del creador
        if (foundPhoto.userId) {
          try {
            const userRef = doc(db, "users", foundPhoto.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data() as any;
              setCreator({
                displayName:
                  (data.displayName as string | undefined) ?? undefined,
                avatarUrl:
                  (data.avatarUrl as string | undefined | null) ?? null,
              });
            } else {
              setCreator(null);
            }
          } catch (err) {
            console.error("Error cargando perfil de creador:", err);
            setCreator(null);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error cargando foto:", err);
        setError("Ocurrió un error al cargar la foto.");
        setLoading(false);
      }
    }

    loadPhoto();
  }, [slugOrId]);

  // 👉 Comprobar si ya está desbloqueada (localStorage) + status=success
  useEffect(() => {
    if (!photo) return;

    const status = searchParams.get("status");
    // Si venimos de un pago exitoso
    if (status === "success") {
      if (typeof window !== "undefined" && storageKey) {
        window.localStorage.setItem(storageKey, "1");
      }
      setIsUnlocked(true);
      return;
    }

    // Si no, revisar si ya estaba desbloqueada
    if (typeof window !== "undefined" && storageKey) {
      const value = window.localStorage.getItem(storageKey);
      if (value === "1") {
        setIsUnlocked(true);
      }
    }
  }, [photo, searchParams, storageKey]);

  const displayPrice = useMemo(() => {
    if (!photo) return "";
    return `$${photo.price} MXN`;
  }, [photo]);

  const creatorName = useMemo(() => {
    if (creator?.displayName && creator.displayName.trim() !== "") {
      return creator.displayName;
    }
    if (!photo) return "Creador";
    // fallback neutro
    return "Creador de UnlockMe";
  }, [creator, photo]);

  const creatorInitials = useMemo(() => {
    const name = creatorName.trim();
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[1].charAt(0).toUpperCase()
    );
  }, [creatorName]);

  // 👉 Flujo de pago (Stripe u otra pasarela vía /api/checkout)
  async function handleUnlock() {
    if (!photo) return;
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId: photo.id,
          price: photo.price,
          title: photo.title,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error || "No se pudo iniciar el pago. Inténtalo de nuevo.";
        setError(msg);
        setCheckoutLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
      } else {
        setError("No se recibió la URL de pago.");
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Error al iniciar checkout:", err);
      setError("Ocurrió un error al iniciar el pago.");
      setCheckoutLoading(false);
    }
  }

  // 👉 Enviar reporte de contenido
  async function handleSendReport(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return;

    if (!reportReason.trim()) {
      setReportError("Selecciona un motivo para el reporte.");
      return;
    }

    setReportError(null);
    setReportMessage(null);
    setReportSending(true);

    try {
      await addDoc(collection(db, "reports"), {
        photoId: photo.id,
        photoSlug: photo.slug,
        creatorId: photo.userId,
        reason: reportReason.trim(),
        details: reportDetails.trim() || null,
        status: "pending",
        createdAt: new Date(),
        pageUrl:
          typeof window !== "undefined"
            ? window.location.href
            : null,
        userAgent:
          typeof navigator !== "undefined"
            ? navigator.userAgent
            : null,
      });

      setReportMessage(
        "Gracias. Tu reporte se ha enviado y será revisado por el equipo."
      );
      setReportReason("");
      setReportDetails("");
      setReportSending(false);
    } catch (err) {
      console.error("Error enviando reporte:", err);
      setReportError(
        "No se pudo enviar el reporte. Inténtalo de nuevo más tarde."
      );
      setReportSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Cargando foto...
      </main>
    );
  }

  if (error || !photo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">
            {error || "Foto no encontrada"}
          </h1>
          <p className="text-sm text-gray-400 mb-4">
            Es posible que el enlace esté mal escrito o que el contenido ya
            no esté disponible.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header: info del creador */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-400 flex items-center justify-center overflow-hidden">
              {creator?.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creatorName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-slate-900 font-bold text-lg">
                  {creatorInitials}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-[0.25em]">
                Contenido premium
              </span>
              <span className="text-sm sm:text-base font-semibold">
                {creatorName}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
          >
            Ir al inicio
          </button>
        </header>

        {/* Contenido principal */}
        <section className="grid md:grid-cols-2 gap-6 items-start">
          {/* Foto */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 sm:p-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-800 min-h-[260px] flex items-center justify-center">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className={`w-full h-full object-cover transition-all duración-500 ${
                  isUnlocked ? "" : "blur-xl scale-105"
                }`}
              />
              {!isUnlocked && (
                <div className="absolute inset-0 bg-slate-950/60" />
              )}

              {!isUnlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <p className="text-sm font-semibold mb-1">
                    Foto premium bloqueada
                  </p>
                  <p className="text-xs text-gray-300 mb-3">
                    Desbloquea para ver la imagen completa en alta calidad.
                  </p>
                  <span className="inline-flex items-center rounded-full bg-black/40 border border-emerald-300/60 px-3 py-1 text-[11px] text-emerald-200 mb-1">
                    {displayPrice} · pago único
                  </span>
                  <p className="text-[11px] text-gray-400 max-w-xs">
                    No necesitas crear cuenta. Pagas, desbloqueas y ves la
                    foto directamente desde este enlace.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info y acciones */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold mb-2">
                {photo.title || "Foto premium"}
              </h1>
              <p className="text-sm text-gray-300 mb-1">
                Contenido visual exclusivo compartido a través de UnlockMe.
              </p>
              <p className="text-xs text-gray-500">
                Por seguridad, no recomendamos hacer capturas o reenviar
                contenido sin permiso del creador.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">
                    Precio de desbloqueo
                  </span>
                  <span className="text-lg font-bold text-emerald-300">
                    {displayPrice}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              {!isUnlocked ? (
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={checkoutLoading}
                  className="mt-1 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkoutLoading
                    ? "Redirigiendo al pago..."
                    : "Desbloquear foto"}
                </button>
              ) : (
                <div className="mt-1 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400/10 border border-emerald-400/60 text-emerald-200 text-sm font-semibold">
                  Foto desbloqueada ✔
                </div>
              )}

              <p className="text-[11px] text-gray-500">
                Pagos procesados de forma segura por la pasarela de pago
                (modo beta). UnlockMe no comparte tus datos de tarjeta con
                el creador.
              </p>
            </div>

            {/* Botón de reportar contenido */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportOpen(true);
                  setReportError(null);
                  setReportMessage(null);
                }}
                className="self-start text-[11px] text-gray-400 hover:text-red-300 underline-offset-2 hover:underline"
              >
                ¿Ves algo raro en esta foto? Reportar contenido
              </button>
              <p className="text-[10px] text-gray-500">
                Usamos los reportes para detectar contenido que pueda
                violar nuestras reglas: menores de edad, contenido ilegal,
                suplantación de identidad, etc.
              </p>
            </div>
          </div>
        </section>

        {/* Modal de reporte */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">
                  Reportar esta foto
                </h2>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  Cerrar
                </button>
              </div>

              <form
                onSubmit={handleSendReport}
                className="space-y-3 text-sm"
              >
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Motivo del reporte
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="minor">
                      Sospecha de menor de edad
                    </option>
                    <option value="illegal">
                      Contenido ilegal o no consensuado
                    </option>
                    <option value="impersonation">
                      Suplantación de identidad
                    </option>
                    <option value="copyright">
                      Infringe derechos de autor
                    </option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Detalles (opcional)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) =>
                      setReportDetails(e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 resize-none"
                    placeholder="Explica brevemente qué te preocupa de este contenido."
                  />
                </div>

                {reportError && (
                  <p className="text-xs text-red-400">
                    {reportError}
                  </p>
                )}
                {reportMessage && (
                  <p className="text-xs text-emerald-300">
                    {reportMessage}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={reportSending}
                    className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 text-xs font-semibold hover:bg-emerald-300 transición disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reportSending
                      ? "Enviando reporte..."
                      : "Enviar reporte"}
                  </button>
                </div>

                <p className="mt-2 text-[10px] text-gray-500">
                  No usaremos tu reporte para atacar al creador. Solo lo
                  revisaremos para proteger a menores, prevenir delitos y
                  mantener la plataforma dentro de la ley.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
