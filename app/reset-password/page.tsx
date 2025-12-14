"use client";

import type React from "react";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Ingresa tu correo electrónico.");
      return;
    }

    try {
      setSending(true);
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
      );
    } catch (err) {
      console.error("Error al enviar correo de recuperación:", err);
      setErrorMsg("No se pudo enviar el correo. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Restablecer contraseña
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

          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}

          {message && (
            <p className="text-xs text-emerald-300">{message}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-gray-400 text-center">
          ¿Ya la recordaste?{" "}
          <a href="/login" className="text-emerald-300 underline">
            Volver al login
          </a>
        </p>
      </div>
    </main>
  );
}
