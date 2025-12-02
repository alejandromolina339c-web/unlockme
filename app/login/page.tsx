// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Si ya está logueado, lo mandamos directo al panel
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/panel");
      }
      setCheckingSession(false);
    });

    return () => unsub();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/panel"); // éxito → panel
    } catch (err: any) {
      console.error("Error al iniciar sesión:", err);

      const code = err?.code as string | undefined;
      let message = err?.message || "Error al iniciar sesión";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        message = "Correo o contraseña incorrectos.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex items-center justify.center min-h-screen bg-black text-white">
        <p className="text-gray-300 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-xl shadow-md w-full max-w-xs"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          Iniciar sesión
        </h2>

        {error && (
          <p className="text-red-400 mb-2 text-sm text-center">
            {error}
          </p>
        )}

        <div className="mb-3">
          <input
            type="email"
            placeholder="Correo"
            className="w-full p-2 rounded text-black text-sm outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-2">
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-2 rounded text-black text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* 🔹 AQUÍ VA EL LINK DE "OLVIDASTE TU CONTRASEÑA" */}
        <div className="flex justify-end mb-4">
          <Link
            href="/reset-password"
            className="text-[11px] text-emerald-300 hover:text-emerald-200"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg.white text-black py-2 rounded font-semibold text-sm hover:bg-gray-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-emerald-300 hover:text-emerald-200"
          >
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
}
