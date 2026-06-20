"use client";
import { useState } from "react";

// NUEVO: Definimos qué propiedades espera recibir este componente
interface LoginProps {
  onLoginSuccess: (rol: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? ""
      : "http://localhost:8000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const userLimpio = username.trim().toLowerCase();
    const passLimpia = password.trim();

    try {
      const res = await fetch(`${API_URL}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userLimpio, password: passLimpia }),
      });

      if (!res.ok) throw new Error("Credenciales inválidas");
      const data = await res.json();

      localStorage.setItem("pics_token", data.access_token);
      localStorage.setItem("pics_rol", data.rol);

      onLoginSuccess(data.rol);
    } catch (err) {
      console.error("Error en login:", err);
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030712] z-50 flex flex-col justify-center items-center overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00aaff]/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <form
        onSubmit={handleLogin}
        className="bg-[#080d1a]/55 border border-white/5 backdrop-blur-md p-10 rounded-2xl w-[370px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/10 hover:shadow-[0_20px_50px_rgba(0,170,255,0.04)] transition-all duration-500 z-10"
      >
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00aaff]/10 border border-[#00aaff]/20 mb-4 shadow-[0_0_20px_rgba(0,170,255,0.15)] text-[#00aaff] text-3xl">
            <i className="fa-solid fa-map-location-dot"></i>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-wide">
            PICS Moreno
          </h2>
          <p className="text-gray-400 text-xs mt-1.5 uppercase tracking-widest font-semibold">
            Portal de Acceso
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/5 bg-[#060a13]/60 text-white placeholder-gray-500 outline-none focus:border-[#00aaff]/70 focus:bg-[#060a13]/90 transition-all duration-300 text-sm"
            />
          </div>

          <div className="relative">
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/5 bg-[#060a13]/60 text-white placeholder-gray-500 outline-none focus:border-[#00aaff]/70 focus:bg-[#060a13]/90 transition-all duration-300 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#00aaff] hover:bg-[#0099ee] text-white font-bold text-sm cursor-pointer shadow-[0_0_15px_rgba(0,170,255,0.3)] hover:shadow-[0_0_25px_rgba(0,170,255,0.5)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-300"
        >
          Ingresar
        </button>

        {error && (
          <div className="text-[#ff4d4d] text-xs font-semibold mt-4 bg-[#ff4d4d]/10 border border-[#ff4d4d]/20 py-2.5 rounded-lg flex items-center justify-center gap-1.5 animate-pulse">
            <i className="fa-solid fa-triangle-exclamation"></i> Usuario o contraseña incorrectos
          </div>
        )}
      </form>
    </div>
  );
}
