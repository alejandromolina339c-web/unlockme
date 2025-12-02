// app/reset-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "ok" | "error">(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setMessage("");
    setLoading(true);

    try {
      await resetPassword(email);
      setStatus("ok");
      setMessage(
        "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."
      );
    } catch (err: any) {
      console.error("Error al enviar correo de reset:", err);
      setStatus("error");
      setMessage(
        "No se pudo enviar el correo de recuperación. Revisa el correo o inténtalo más tarde."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-xl shadow-md w-full max-w-xs"
      >
        <h2 className="text-xl font-bold mb-3 text-center">
          Recuperar contraseña
        </h2>
        <p className="text-[11px] text-gray-400 mb-4 text-center">
          Ingresa el correo con el que te registraste. Te enviaremos un
          enlace para restablecer tu contraseña.
        </p>

        {status === "ok" && (
          <p className="text-emerald-300 text-xs mb-2 text-center">
            {message}
          </p>
        )}

        {status === "error" && (
          <p className="text-red-400 text-xs mb-2 text-center">
            {message}
          </p>
        )}

        <div className="mb-4">
          <input
            type="email"
            placeholder="Tu correo"
            className="w-full p-2 rounded text-black text-sm outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black py-2 rounded font-semibold text-sm hover:bg-gray-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          ¿Recordaste tu contraseña?{" "}
          <Link
            href="/login"
            className="text-emerald-300 hover:text-emerald-200"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
