"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type UserProfile = {
  displayName: string;
  avatarUrl: string;
  payoutMethod: string;
  payoutDetails: string;
};

export default function AjustesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (!current) {
        setUser(null);
        router.push("/login");
      } else {
        setUser(current);
        void loadProfile(current.uid);
      }
    });

    return () => unsub();
  }, [router]);

  async function loadProfile(userId: string) {
    try {
      setLoadingProfile(true);
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile> & {
          email?: string;
        };
        setDisplayName(data.displayName ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
        setPayoutMethod(data.payoutMethod ?? "");
        setPayoutDetails(data.payoutDetails ?? "");
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setError("No se pudo cargar tu perfil.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          email: user.email ?? null,
          displayName: displayName.trim(),
          avatarUrl: avatarUrl.trim(),
          payoutMethod: payoutMethod.trim(),
          payoutDetails: payoutDetails.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
      setSuccess("Ajustes guardados correctamente ✅");
    } catch (err) {
      console.error("Error guardando ajustes:", err);
      setError("No se pudieron guardar los ajustes.");
    } finally {
      setSaving(false);
    }
  }

  if (!user && loadingProfile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Cargando...
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-[0.25em]">
              Ajustes de cuenta
            </span>
            <span className="font-semibold text-sm sm:text-base">
              {user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/panel")}
            className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
          >
            Volver al panel
          </button>
        </header>

        {/* FORM AJUSTES */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-6">
          <h2 className="text-sm font-semibold mb-4">
            Perfil público y cobros
          </h2>

          {loadingProfile ? (
            <p className="text-xs text-gray-400">Cargando perfil...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Nombre público
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="Ej. daniela-fotos"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Este es el nombre que verán los compradores en tus fotos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    URL de tu foto de perfil (opcional)
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Más adelante podemos conectar un uploader directo, por ahora es un enlace.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-semibold mb-2 text-gray-300">
                  Datos para retiros (vista del creador)
                </h3>
                <p className="text-[11px] text-gray-500 mb-3">
                  Aquí puedes guardar cómo quieres cobrar (por ejemplo,
                  alias de Mercado Pago, CLABE, cuenta bancaria, etc.).
                  Esta información no se muestra a los compradores, solo
                  se usa para coordinar tus pagos cuando el sistema de
                  retiros esté activo.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Método de cobro
                    </label>
                    <input
                      type="text"
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      placeholder="Ej. Mercado Pago, Banco, PayPal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Detalle / referencia
                    </label>
                    <input
                      type="text"
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                      placeholder="Alias, CLABE, email, etc."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-300">{success}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar ajustes"}
              </button>
            </form>
          )}
        </section>

        <p className="text-[10px] text-gray-500 text-center">
          Nota: Esta sección solo configura tu perfil y datos de cobro.
          La lógica real de pagos y retiros se maneja desde el backend y la
          pasarela (Mercado Pago, etc.).
        </p>
      </div>
    </main>
  );
}
