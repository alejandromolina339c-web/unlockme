"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { RecaptchaVerifier, linkWithPhoneNumber } from "firebase/auth";

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // reason=signup | withdraw (por default signup)
  const reason = useMemo(() => {
    const r = (searchParams.get("reason") || "").trim();
    return r === "withdraw" ? "withdraw" : "signup";
  }, [searchParams]);

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [phone, setPhone] = useState(""); // ej +526241234567
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");

  const [confirmation, setConfirmation] = useState<any>(null);

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
    });

    return () => unsub();
  }, [router]);

  function getOrCreateRecaptcha() {
    // @ts-expect-error - guardamos global en window para evitar recrearlo
    if (typeof window !== "undefined" && window.__unlockmeRecaptcha) {
      // @ts-expect-error
      return window.__unlockmeRecaptcha as RecaptchaVerifier;
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });

    // @ts-expect-error
    if (typeof window !== "undefined") window.__unlockmeRecaptcha = verifier;
    return verifier;
  }

  async function handleSendCode() {
    if (!user) return;

    setErrorMsg("");
    setMessage("");

    const cleaned = phone.trim();

    // Requisito mínimo: que venga en formato E.164 con +
    if (!cleaned.startsWith("+") || cleaned.length < 10) {
      setErrorMsg("Escribe tu número con código de país. Ej: +526241234567");
      return;
    }

    setLoading(true);
    try {
      const verifier = getOrCreateRecaptcha();

      // ✅ Esto NO cambia de usuario; enlaza el teléfono al usuario actual
      const confirmationResult = await linkWithPhoneNumber(
        user,
        cleaned,
        verifier
      );

      setConfirmation(confirmationResult);
      setStep("code");
      setMessage("Código enviado por SMS ✅");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "No se pudo enviar el código. Revisa el número e intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCode() {
    if (!user) return;
    if (!confirmation) {
      setErrorMsg("Primero envía el código.");
      return;
    }

    setErrorMsg("");
    setMessage("");
    setLoading(true);

    try {
      const c = code.trim();
      if (c.length < 4) {
        setErrorMsg("Escribe el código completo.");
        setLoading(false);
        return;
      }

      await confirmation.confirm(c);

      // ✅ Guardar banderas en Firestore
      const ref = doc(db, "users", user.uid);
      const now = new Date();

      const payload: any = {
        phoneNumber: phone.trim(),
        phoneVerified: true,
        phoneVerifiedAt: now,
        updatedAt: now,
      };

      if (reason === "withdraw") {
        payload.withdrawalPhoneVerifiedAt = now;
      }

      await setDoc(ref, payload, { merge: true });

      setMessage("Teléfono verificado ✅");

      // Redirección
      if (reason === "withdraw") {
        router.push("/panel/ajustes");
      } else {
        router.push("/panel");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("El código es incorrecto o expiró. Intenta de nuevo.");
    } finally {
      setLoading(false);
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
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 space-y-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">
              {reason === "withdraw" ? "Verificación para retiro" : "Verificación de cuenta"}
            </p>
            <h1 className="text-lg font-semibold">
              Verifica tu número por SMS
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Esto ayuda a proteger tu cuenta y tus retiros.
            </p>
          </div>

          {/* contenedor requerido por RecaptchaVerifier */}
          <div id="recaptcha-container" />

          {step === "phone" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Número (con código de país)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+526241234567"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Ejemplo México: <span className="font-mono">+52</span> + tu número.
                </p>
              </div>

              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
              {message && <p className="text-xs text-emerald-300">{message}</p>}

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Código SMS
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
              {message && <p className="text-xs text-emerald-300">{message}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setConfirmation(null);
                    setMessage("");
                    setErrorMsg("");
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-slate-600 text-gray-200 text-sm hover:bg-slate-800 transition"
                >
                  Cambiar número
                </button>

                <button
                  onClick={handleConfirmCode}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Verificando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
