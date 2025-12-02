// app/mi-foto/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type PhotoData = {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  hdPrice?: number;
  creatorName?: string;
};

// 🔹 Mapea un doc de Firestore a PhotoData
function mapPhotoDoc(snap: any): PhotoData {
  const data = snap.data() as any;

  if (!data.imageUrl) {
    throw new Error("La foto no tiene una URL de imagen válida.");
  }

  // 👉 Intentar sacar el precio desde varios campos y en distintos formatos
  const candidates = [data.price, data.amount, data.mxnPrice];
  let priceNum: number | null = null;

  for (const value of candidates) {
    if (typeof value === "number") {
      priceNum = value;
      break;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        priceNum = parsed;
        break;
      }
    }
  }

  // Si no encontramos nada razonable, usamos un valor por defecto,
  // pero NO rompemos la página.
  if (priceNum === null || !Number.isFinite(priceNum) || priceNum <= 0) {
    console.warn(
      "Documento sin precio válido, usando precio por defecto 120. ID:",
      snap.id,
      data
    );
    priceNum = 120; // 🔹 Ajusta si quieres otro default
  }

  return {
    id: snap.id,
    title: data.title || data.name || "Foto premium",
    imageUrl: data.imageUrl,
    price: priceNum,
    hdPrice: typeof data.hdPrice === "number" ? data.hdPrice : undefined,
    creatorName:
      data.creatorName || data.userName || data.ownerName || "Creador",
  };
}

// 🔹 Buscar foto por ID de documento o por slug/customId/etc.
async function fetchPhoto(photoId: string): Promise<PhotoData> {
  // 1) Intentar por ID directo
  const directRef = doc(db, "photos", photoId);
  const directSnap = await getDoc(directRef);

  if (directSnap.exists()) {
    return mapPhotoDoc(directSnap);
  }

  // 2) Intentar por campos conocidos
  const candidates = ["slug", "customId", "shortId", "publicId"];

  for (const field of candidates) {
    const q = query(
      collection(db, "photos"),
      where(field, "==", photoId),
      limit(1)
    );
    const qSnap = await getDocs(q);

    if (!qSnap.empty) {
      const docSnap = qSnap.docs[0];
      return mapPhotoDoc(docSnap);
    }
  }

  throw new Error("Foto no encontrada.");
}

export default function PhotoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const photoId = params?.id as string;

  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const status = searchParams.get("status");

  const localKey = useMemo(
    () => (photoId ? `mi-foto-unlocked-${photoId}` : ""),
    [photoId]
  );

  // Cargar datos DESDE FIRESTORE
  useEffect(() => {
    if (!photoId) return;

    setLoading(true);
    setError(null);

    fetchPhoto(photoId)
      .then((data) => setPhoto(data))
      .catch((err) => {
        console.error("Error cargando foto:", err);
        setError(err.message || "No se pudo cargar la foto.");
      })
      .finally(() => setLoading(false));
  }, [photoId]);

  // Revisar si ya estaba desbloqueada en este navegador
  useEffect(() => {
    if (!localKey) return;
    const flag = localStorage.getItem(localKey);
    if (flag === "true") {
      setUnlocked(true);
    }
  }, [localKey]);

  // Viene de Stripe con éxito o cancel
  useEffect(() => {
    if (!localKey) return;

    if (status === "success") {
      setUnlocked(true);
      localStorage.setItem(localKey, "true");
    }
  }, [status, localKey]);

  async function handlePay() {
    if (!photo) return;
    setError(null);
    setPaying(true);

    try {
      // 🔹 Mandamos todos los campos que el backend podría necesitar
      const body = {
        photoId: photo.id,
        amount: photo.price, // típico nombre para Stripe
        description: photo.title,
        price: photo.price, // nuestro campo
        title: photo.title,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Respuesta de /api/checkout:", res.status, text);
        let msg = "Error al iniciar el pago";
        try {
          const data = text ? JSON.parse(text) : null;
          if (data?.error) msg = data.error;
        } catch {
          // no es JSON
        }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("No se recibió la URL de pago.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("handlePay error:", err);
      setError(err.message || "No se pudo iniciar el pago.");
      setPaying(false);
    }
  }

  // Ver a tamaño completo (abre la imagen en otra pestaña)
  function handleOpenFull() {
    if (!photo) return;
    window.open(photo.imageUrl, "_blank");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando foto...
      </div>
    );
  }

  if (error && !photo) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p>{error}</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p>Foto no encontrada.</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-400 flex items-center justify-center text-slate-900 font-black text-sm">
              MF
            </div>
            <span className="text-sm font-semibold">Mi-Foto</span>
          </Link>

          <Link
            href="/login"
            className="text-xs sm:text-sm text-gray-300 hover:text-white"
          >
            Entrar como creador
          </Link>
        </header>

        {/* Banner de estado pago */}
        {status === "success" && (
          <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
            ✅ Pago recibido. Esta foto ha sido desbloqueada en este
            navegador. Puedes verla siempre sin volver a pagar.
          </div>
        )}

        {status === "cancel" && (
          <div className="rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-2 text-xs text-gray-300">
            El pago fue cancelado. Puedes intentarlo de nuevo cuando
            quieras.
          </div>
        )}

        {/* Contenido principal */}
        <section className="grid md:grid-cols-2 gap-8 items-start mt-2">
          {/* Imagen */}
          <div className="relative w-full aspect-[3/4] rounded-2xl bg-slate-900 overflow-hidden border border-slate-700/60 shadow-2xl">
            <Image
              src={photo.imageUrl}
              alt={photo.title}
              fill
              className={`object-cover transition-all duration-500 ${
                unlocked ? "blur-0" : "blur-xl scale-105"
              }`}
            />

            {!unlocked && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
                <p className="text-xs text-emerald-200 mb-1 uppercase tracking-[0.2em]">
                  Foto premium
                </p>
                <h1 className="text-lg font-semibold mb-2">
                  Desbloquea para ver la imagen completa
                </h1>
                <p className="text-xs text-gray-300 mb-4 max-w-xs">
                  Una vez desbloquees esta foto, podrás verla siempre
                  desde este navegador sin volver a pagar.
                </p>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paying
                    ? "Redirigiendo al pago..."
                    : `Desbloquear por $${photo.price} MXN`}
                </button>
                <p className="mt-2 text-[10px] text-gray-400">
                  Pago seguro con tarjeta. No necesitas crear cuenta como
                  comprador.
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-emerald-300 uppercase tracking-[0.25em] mb-1">
                Contenido premium
              </p>
              <h2 className="text-2xl font-bold mb-1">
                {photo.title || "Foto exclusiva"}
              </h2>
              {photo.creatorName && (
                <p className="text-sm text-gray-300">
                  Creado por{" "}
                  <span className="font-semibold">
                    {photo.creatorName}
                  </span>
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900/70 border border-slate-700/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Precio</p>
                  <p className="text-xl font-bold">
                    ${photo.price}{" "}
                    <span className="text-xs text-gray-400">MXN</span>
                  </p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying || unlocked}
                  className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {unlocked
                    ? "Ya desbloqueada"
                    : paying
                    ? "Redirigiendo..."
                    : "Desbloquear ahora"}
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Al desbloquear, podrás volver a ver esta foto desde este
                navegador sin volver a pagar. El contenido pertenece al
                creador; evita redistribuirlo sin permiso.
              </p>
            </div>

            {unlocked && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-700/60 p-4 space-y-3">
                <p className="text-sm font-semibold">
                  Foto desbloqueada ✅
                </p>
                <p className="text-xs text-gray-400">
                  Ya puedes ver esta foto siempre desde este navegador. Si
                  cierras y vuelves a entrar con el mismo enlace, seguirá
                  desbloqueada.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleOpenFull}
                    className="inline-flex items-center px-4 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
                  >
                    Ver a tamaño completo
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
