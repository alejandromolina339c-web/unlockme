"use client";

import type React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
} from "firebase/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isAdult, setIsAdult] = useState(false);

  // ✅ Teléfono / SMS
  const [phone, setPhone] = useState(""); // formato E.164 ej: +5216241234567
  const [smsCode, setSmsCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSendCode() {
    setErrorMsg("");

    const phoneClean = phone.trim();
    if (!phoneClean) {
      setErrorMsg("Escribe tu número (ej. +5216241234567).");
      return;
    }
    if (!phoneClean.startsWith("+")) {
      setErrorMsg("El número debe incluir + y código de país (ej. +52...).");
      return;
    }

    try {
      setSendingCode(true);

      // Crear recaptcha (invisible) una sola vez
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneClean,
        recaptchaRef.current
      );

      setVerificationId(confirmation.verificationId);
    } catch (err) {
      console.error("Error enviando SMS:", err);
      setErrorMsg("No se pudo enviar el SMS. Revisa el número e inténtalo.");
      // Si recaptcha se queda “sucio”, lo reseteamos
      try {
        recaptchaRef.current?.clear();
      } catch {}
      recaptchaRef.current = null;
    } finally {
      setSendingCode(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim() || !confirm.trim()) {
      setErrorMsg("Completa todos los campos.");
      return;
    }

    if (!isAdult) {
      setErrorMsg("Debes confirmar que eres mayor de edad (18+).");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    // ✅ SMS requerido
    if (!verificationId) {
      setErrorMsg("Primero envía el código SMS y recíbelo en tu teléfono.");
      return;
    }
    if (!smsCode.trim()) {
      setErrorMsg("Escribe el código SMS que te llegó.");
      return;
    }

    try {
      setLoading(true);

      // 1) Crear usuario email/password (lo que ya tenías)
      await register(email.trim(), password.trim());

      // 2) Linkear teléfono al usuario (Phone Auth)
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No se detectó sesión tras el registro.");
      }

      const credential = PhoneAuthProvider.credential(
        verificationId,
        smsCode.trim()
      );

      await linkWithCredential(currentUser, credential);

      // 3) Listo
      router.push("/panel");
    } catch (err) {
      console.error("Error en registro:", err);
      setErrorMsg(
        "No se pudo completar el registro/verificación. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Crear cuenta de creador
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="tu-correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirm(e.target.value)
              }
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="Repite tu contraseña"
            />
          </div>

          {/* ✅ Checkbox 18+ */}
          <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
            <input
              type="checkbox"
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            Soy mayor de edad (18+)
          </label>

          {/* ✅ Teléfono + SMS */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs text-gray-300 mb-1">
              Teléfono (para verificación SMS)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="+5216241234567"
            />

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode}
              className="mt-2 w-full inline-flex items-center justify-center px-4 py-2 rounded-full border border-emerald-500/70 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingCode ? "Enviando código..." : "Enviar código SMS"}
            </button>

            <label className="block text-xs text-gray-300 mb-1 mt-3">
              Código SMS
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={smsCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSmsCode(e.target.value)
              }
              className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="123456"
            />

            {/* contenedor requerido por Firebase RecaptchaVerifier */}
            <div id="recaptcha-container" />
          </div>

          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-gray-400 text-center">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-emerald-300 underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </main>
  );
}
