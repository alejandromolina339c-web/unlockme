"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await register(email, password);
      alert("Cuenta creada con éxito");
      router.push("/login"); // después del registro, mandamos a login
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded shadow-md w-80"
      >
        <h2 className="text-2xl font-bold mb-4">Crear cuenta</h2>

        {error && <p className="text-red-400 mb-2">{error}</p>}

        <input
          type="email"
          placeholder="Correo"
          className="w-full p-2 rounded mb-3 text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full p-2 rounded mb-3 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-white text-black py-2 rounded font-semibold">
          Registrarme
        </button>
      </form>
    </div>
  );
}
