"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type UserProfile = {
  displayName: string;
  avatarUrl: string;
  payoutMethod: string;
  payoutDetails: string;
};

export default function AjustesPanelPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    avatarUrl: "",
    payoutMethod: "",
    payoutDetails: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Avatar upload states (solo UI)
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Cargar usuario + perfil
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (!current) {
        setUser(null);
        setCheckingAuth(false);
        router.push("/login");
        return;
      }

      setUser(current);
      setCheckingAuth(false);
      void loadProfile(current);
    });

    return () => unsub();
  }, [router]);

  async function loadProfile(currentUser: User) {
    try {
      setLoadingProfile(true);
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        setProfile({
          displayName:
            data.displayName ??
            currentUser.displayName ??
            currentUser.email ??
            "",
          avatarUrl: data.avatarUrl ?? "",
          payoutMethod: data.payoutMethod ?? "",
          payoutDetails: data.payoutDetails ?? "",
        });
      } else {
        // Perfil nuevo
        setProfile({
          displayName: currentUser.displayName ?? currentUser.email ?? "",
          avatarUrl: "",
          payoutMethod: "",
          payoutDetails: "",
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      setErrorMsg("No se pudo cargar tu perfil.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function uploadAvatarToCloudinary(file: File) {
    setAvatarError("");
    setUploadingAvatar(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Faltan variables de entorno de Cloudinary. Revisa NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
        );
      }

      // Validaciones básicas (solo UI)
      if (!file.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen.");
      }
      const maxMb = 8;
      if (file.size > maxMb * 1024 * 1024) {
        throw new Error(`La imagen es muy pesada. Máximo ${maxMb}MB.`);
      }

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

      // Guardamos URL en el estado (se persistirá al guardar)
      setProfile((prev) => ({ ...prev, avatarUrl: data.secure_url ?? "" }));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo subir la foto.";
      setAvatarError(msg);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setMessage("");
    setErrorMsg("");

    try {
      const ref = doc(db, "users", user.uid);

      await setDoc(
        ref,
        {
          displayName: profile.displayName.trim(),
          avatarUrl: profile.avatarUrl.trim(),
          payoutMethod: profile.payoutMethod.trim(),
          payoutDetails: profile.payoutDetails.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setMessage("Tu perfil se guardó correctamente ✅");
    } catch (error) {
      console.error("Error guardando perfil:", error);
      setErrorMsg("No se pudo guardar tu perfil. Intenta de nuevo.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Verificando sesión...
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-400 flex items-center justify-center text-slate-900 font-black text-lg">
              U
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">
                Ajustes del creador
              </span>
              <span className="font-semibold text-sm sm:text-base">
                {profile.displayName || user.email || "Tu perfil"}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/panel")}
            className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] sm:text-xs text-gray-200 hover:bg-slate-800 transition"
          >
            Volver al panel
          </button>
        </header>

        {loadingProfile ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <p className="text-xs text-gray-400">Cargando perfil...</p>
          </section>
        ) : (
          <form onSubmit={handleSaveProfile} className="grid lg:grid-cols-2 gap-6">
            {/* 1) PERFIL (foto + nombre) */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold mb-1">Perfil público</h2>
                <p className="text-[11px] text-gray-400">
                  Esto se muestra a tus compradores en la página de tus fotos.
                </p>
              </div>

              {/* Foto + preview */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-800 border border-slate-700">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-gray-300 mb-2">
                    Foto de perfil (elige desde tu teléfono)
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) void uploadAvatarToCloudinary(f);
                      // Permite volver a elegir la misma imagen si quieren
                      e.currentTarget.value = "";
                    }}
                    className="w-full text-xs text-gray-200
                      file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0
                      file:text-xs file:font-semibold file:bg-emerald-400 file:text-slate-900
                      hover:file:bg-emerald-300 cursor-pointer"
                    disabled={uploadingAvatar}
                  />

                  <div className="mt-2 flex items-center gap-2">
                    {uploadingAvatar ? (
                      <span className="text-[11px] text-gray-400">
                        Subiendo foto...
                      </span>
                    ) : profile.avatarUrl ? (
                      <span className="text-[11px] text-emerald-300">
                        Foto lista ✅
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500">
                        Selecciona una imagen para tu avatar.
                      </span>
                    )}

                    {profile.avatarUrl && !uploadingAvatar && (
                      <button
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, avatarUrl: "" }))}
                        className="ml-auto px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-gray-200 hover:bg-slate-800 transition"
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>

                  {avatarError && (
                    <p className="mt-2 text-xs text-red-400">{avatarError}</p>
                  )}
                </div>
              </div>

              {/* Nombre público */}
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Nombre público
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej. Daniela Photos, Juan Creator..."
                />
              </div>

              {/* Mini tip */}
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-[11px] text-gray-300">
                Tip: si no quieres mostrar tu rostro, usa un logo o avatar. Mantén buena
                calidad para verte más premium.
              </div>
            </section>

            {/* 2) PAGOS / RETIROS */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold mb-1">Pagos / retiros</h2>
                <p className="text-[11px] text-gray-400">
                  Por ahora es informativo. Más adelante se usará para tus retiros.
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Método preferido (ej. Mercado Pago, transferencia)
                </label>
                <input
                  type="text"
                  value={profile.payoutMethod}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile((prev) => ({
                      ...prev,
                      payoutMethod: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej. Mercado Pago"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Detalles para retiro (CLABE, correo de MP, etc.)
                </label>
                <textarea
                  value={profile.payoutDetails}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setProfile((prev) => ({
                      ...prev,
                      payoutDetails: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 resize-none min-h-[90px]"
                  placeholder="Ej. Correo de tu cuenta de Mercado Pago, CLABE, banco, etc."
                />
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-[11px] text-gray-300">
                Nota: no muestres datos sensibles públicamente. Esto solo se guarda en tu
                documento de usuario y solo tú puedes leerlo por reglas de Firestore.
              </div>
            </section>

            {/* MENSAJES + BOTÓN GUARDAR (full width) */}
            <section className="lg:col-span-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
              {message && <p className="text-xs text-emerald-300">{message}</p>}

              <button
                type="submit"
                disabled={savingProfile || uploadingAvatar}
                className="mt-3 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>

              {uploadingAvatar && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Espera a que termine de subirse la foto antes de guardar.
                </p>
              )}
            </section>
          </form>
        )}
      </div>
    </main>
  );
}
