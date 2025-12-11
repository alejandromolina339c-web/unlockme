// app/panel/ajustes/page.tsx
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { logout } from "@/lib/auth";
import {
  onAuthStateChanged,
  type User,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
} from "firebase/firestore";

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 👉 Perfil público
  const [profileName, setProfileName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  // 👉 Pagos y retiros (beta)
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [country, setCountry] = useState("MX");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [payoutError, setPayoutError] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  // 👉 Nombre corto para encabezado
  const publicName = useMemo(() => {
    if (profileName && profileName.trim() !== "") {
      return profileName.trim();
    }
    if (!user) return "creador";
    if (user.displayName && user.displayName.trim() !== "") {
      return user.displayName;
    }
    if (user.email) {
      const base = user.email.split("@")[0];
      return base.replace(/[._]/g, " ");
    }
    return "creador";
  }, [profileName, user]);

  const initials = useMemo(() => {
    const name = publicName.trim();
    if (!name) return "U";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[1].charAt(0).toUpperCase()
    );
  }, [publicName]);

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
        loadProfile(current);
        loadPayoutProfile(current);
      }
    });

    return () => unsub();
  }, [router]);

  // 👉 Cargar perfil público desde /users/{uid}
  async function loadProfile(current: User) {
    try {
      const ref = doc(db, "users", current.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.displayName) {
          setProfileName(data.displayName as string);
        } else if (current.displayName) {
          setProfileName(current.displayName);
        } else if (current.email) {
          const base = current.email.split("@")[0];
          setProfileName(base.replace(/[._]/g, " "));
        }
        if (data.avatarUrl) {
          setProfileAvatarUrl(data.avatarUrl as string);
        }
      } else {
        if (current.displayName) {
          setProfileName(current.displayName);
        } else if (current.email) {
          const base = current.email.split("@")[0];
          setProfileName(base.replace(/[._]/g, " "));
        }
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
    }
  }

  // 👉 Cargar datos de cobro desde /payoutProfiles/{uid}
  async function loadPayoutProfile(current: User) {
    try {
      const ref = doc(db, "payoutProfiles", current.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as any;
        setBankName((data.bankName as string | undefined) ?? "");
        setAccountName((data.accountName as string | undefined) ?? "");
        setAccountNumber(
          (data.accountNumber as string | undefined) ?? ""
        );
        setCountry((data.country as string | undefined) ?? "MX");
      }
    } catch (err) {
      console.error("Error cargando payout profile:", err);
    }
  }

  // 👉 Guardar perfil público
  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset =
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      let finalAvatarUrl = profileAvatarUrl;

      // Si el usuario seleccionó nueva imagen, la subimos a Cloudinary
      if (avatarFile) {
        if (!cloudName || !uploadPreset) {
          throw new Error(
            "Faltan variables de entorno de Cloudinary. Revisa .env.local"
          );
        }

        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error("Error al subir la foto de perfil.");
        }

        const data = await res.json();
        finalAvatarUrl = data.secure_url as string;
        setProfileAvatarUrl(finalAvatarUrl);
      }

      const cleanName =
        profileName.trim() ||
        publicName ||
        user.email?.split("@")[0] ||
        "creador";

      // Guardamos perfil en Firestore -> /users/{uid}
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          displayName: cleanName,
          avatarUrl: finalAvatarUrl ?? null,
          email: user.email ?? null,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // También actualizamos el displayName en Firebase Auth
      try {
        await updateProfile(user, {
          displayName: cleanName,
        });
      } catch (err) {
        console.warn("No se pudo actualizar displayName en Auth:", err);
      }

      setProfileMessage("Perfil actualizado correctamente ✅");
      setAvatarFile(null);
    } catch (err: any) {
      console.error("Error guardando perfil:", err);
      setProfileError(
        err.message || "No se pudo actualizar el perfil."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // 👉 Guardar datos de cobro
  async function handlePayoutSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    setPayoutError("");
    setPayoutMessage("");
    setPayoutSaving(true);

    try {
      const ref = doc(db, "payoutProfiles", user.uid);
      await setDoc(
        ref,
        {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          country: country.trim() || "MX",
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setPayoutMessage("Datos de cobro guardados correctamente ✅");
    } catch (err: any) {
      console.error("Error guardando payout profile:", err);
      setPayoutError(
        err.message || "No se pudieron guardar los datos de cobro."
      );
    } finally {
      setPayoutSaving(false);
    }
  }

  // 👉 Solicitar retiro (beta, manual)
  async function handleWithdrawSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    if (withdrawAmount === "" || withdrawAmount <= 0) {
      setWithdrawError("Ingresa un monto válido para retirar.");
      return;
    }

    setWithdrawError("");
    setWithdrawMessage("");
    setWithdrawSaving(true);

    try {
      await addDoc(collection(db, "withdrawRequests"), {
        userId: user.uid,
        email: user.email ?? null,
        amount: withdrawAmount,
        status: "pending",
        createdAt: new Date(),
      });

      setWithdrawMessage(
        "Solicitud de retiro enviada. Te contactaremos para completar el proceso. ✅"
      );
      setWithdrawAmount("");
    } catch (err: any) {
      console.error("Error creando solicitud de retiro:", err);
      setWithdrawError(
        err.message || "No se pudo crear la solicitud de retiro."
      );
    } finally {
      setWithdrawSaving(false);
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
            <div className="h-9 w-9 rounded-xl bg-emerald-400 flex items-center justify-center overflow-hidden">
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt={publicName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-slate-900 font-black text-lg">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-[0.25em]">
                Ajustes del creador
              </span>
              <span className="font-semibold text-sm sm:text-base">
                {publicName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/panel")}
              className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-gray-200 hover:bg-slate-800 transition"
            >
              Volver al panel
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-semibold hover:bg-red-400 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* PERFIL PÚBLICO */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-400 flex items-center justify-center overflow-hidden">
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt={publicName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-slate-900 font-black">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold">
                Perfil público del creador
              </h2>
              <p className="text-[11px] text-gray-400">
                Este nombre y foto podrán mostrarse en tus páginas públicas
                de UnlockMe (por ejemplo, en la página de compra de tus fotos).
              </p>
            </div>
          </div>

          <form
            onSubmit={handleProfileSubmit}
            className="grid md:grid-cols-2 gap-4 text-sm"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Nombre público
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej. daniela fotos, Sam Molina, etc."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Foto de perfil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAvatarFile(f);
                  }}
                  className="w-full text-xs text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-400 file:text-slate-900 hover:file:bg-emerald-300 cursor-pointer"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  JPG o PNG recomendados. Tamaño cuadrado se verá mejor.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div className="text-[11px] text-gray-400">
                <p>
                  Mantén tu identidad bajo control: puedes usar tu nombre
                  real, un alias artístico o un nombre neutro.
                </p>
                <p className="mt-2">
                  No compartiremos tu correo completo en páginas públicas.
                  Solo se mostrará el nombre que definas aquí y, si quieres,
                  tu foto de perfil.
                </p>
              </div>

              <div className="space-y-2">
                {profileError && (
                  <p className="text-xs text-red-400">{profileError}</p>
                )}
                {profileMessage && (
                  <p className="text-xs text-emerald-300">
                    {profileMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {profileSaving
                    ? "Guardando perfil..."
                    : "Guardar cambios de perfil"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* PAGOS Y RETIROS (BETA) */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold mb-1">
            Pagos y retiros (beta)
          </h2>
          <p className="text-[11px] text-gray-400 mb-2">
            Aquí configuras cómo quieres que te paguemos cuando retires tus
            ganancias. Por ahora, los retiros se gestionan de forma manual:
            recibimos tu solicitud y te contactamos para completar el proceso.
          </p>

          {/* Datos de cobro */}
          <form
            onSubmit={handlePayoutSubmit}
            className="grid md:grid-cols-2 gap-4 text-sm"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Nombre del banco
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej. BBVA, Banorte, etc."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Titular de la cuenta
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Nombre completo del titular"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Número de cuenta / CLABE
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="CLABE o número de cuenta"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="MX, AR, CO, etc."
                />
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-2 mt-2">
              {payoutError && (
                <p className="text-xs text-red-400">{payoutError}</p>
              )}
              {payoutMessage && (
                <p className="text-xs text-emerald-300">
                  {payoutMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={payoutSaving}
                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {payoutSaving
                  ? "Guardando datos de cobro..."
                  : "Guardar datos de cobro"}
              </button>
            </div>
          </form>

          {/* Solicitud de retiro */}
          <div className="mt-6 border-t border-slate-700 pt-4">
            <h3 className="text-xs font-semibold mb-2 text-gray-200">
              Solicitar retiro (simulado)
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              Esta sección está pensada para cuando la pasarela de pago
              esté conectada. Por ahora, las solicitudes de retiro se
              guardan como registro interno (no hay transferencia
              automática).
            </p>

            <form
              onSubmit={handleWithdrawSubmit}
              className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end text-sm"
            >
              <div className="flex-1">
                <label className="block text-xs text-gray-300 mb-1">
                  Monto a retirar (MXN)
                </label>
                <input
                  type="number"
                  min={0}
                  value={withdrawAmount === "" ? "" : withdrawAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWithdrawAmount(
                      val === "" ? "" : Number(val)
                    );
                  }}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  placeholder="Ej. 500"
                />
              </div>
              <button
                type="submit"
                disabled={withdrawSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {withdrawSaving
                  ? "Enviando solicitud..."
                  : "Solicitar retiro"}
              </button>
            </form>

            {withdrawError && (
              <p className="mt-2 text-xs text-red-400">
                {withdrawError}
              </p>
            )}
            {withdrawMessage && (
              <p className="mt-2 text-xs text-emerald-300">
                {withdrawMessage}
              </p>
            )}

            <p className="mt-2 text-[10px] text-gray-500">
              Más adelante, cuando conectemos la pasarela de pago (Stripe,
              Mercado Pago u otra), estas solicitudes podrán convertirse en
              retiros automáticos. Por ahora, sirven como registro y flujo
              manual controlado por la plataforma.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
