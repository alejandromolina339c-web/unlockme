"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Ingresa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password.trim());
      router.push("/panel");
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setErrorMsg("Correo o contraseña incorrectos, o la cuenta no existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Iniciar sesión
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
              placeholder="Tu contraseña"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Entrar al panel"}
          </button>
        </form>

        <div className="mt-4 text-[11px] text-gray-400 text-center space-y-1">
          <p>
            ¿Olvidaste tu contraseña?{" "}
            <a href="/reset-password" className="text-emerald-300 underline">
              Restablecer contraseña
            </a>
          </p>
          <p>
            ¿Todavía no tienes cuenta?{" "}
            <a href="/register" className="text-emerald-300 underline">
              Crear cuenta
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
