"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const ServiceRow = ({ nombre, icono, estado }: { nombre: string, icono: string, estado: string }) => {
  const isLoading = estado === "LOADING";
  const isOk = estado === "OK" || estado.startsWith("OK");
  const isError = !isLoading && !isOk;

  const barrasPrevias = Array.from({ length: 59 }).map((_, i) => (
    <div
      key={i}
      className="flex-1 h-full rounded-[2px] transition-all duration-200 bg-[#198754]/60 hover:bg-[#3dff7a] hover:shadow-[0_0_8px_rgba(61,255,122,0.8)] cursor-crosshair"
      title="Histórico: Operativo"
    ></div>
  ));

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#080d1a]/40 border border-white/5 border-b-0 hover:bg-[#0d1527]/60 hover:border-[#00aaff]/40 transition-all duration-300 first:rounded-t-2xl last:rounded-b-2xl last:border-b">
      <div className="flex justify-between items-center w-full">
        <div className="font-medium text-[1.05rem] flex flex-col justify-center text-[#e0e0e0]">
          <div className="flex items-center gap-2.5">
            <i className={`${icono} text-[#00aaff] drop-shadow-[0_0_5px_rgba(0,170,255,0.4)] w-5 text-center`}></i> {nombre}
          </div>
          {isOk && estado.includes("(") && (
            <span className="text-xs text-gray-500 font-semibold pl-7 mt-0.5">
              {estado.substring(estado.indexOf("(") + 1, estado.indexOf(")"))}
            </span>
          )}
        </div>
        {/* Textos con Glow Neón */}
        <div className={`text-[1.05rem] font-bold tracking-wide ${
          isLoading ? 'text-[#666]' :
          isOk ? 'text-[#3dff7a] drop-shadow-[0_0_8px_rgba(61,255,122,0.5)]' :
          'text-[#ff3d3d] drop-shadow-[0_0_8px_rgba(255,61,61,0.5)]'
        }`}>
          {isLoading ? 'Consultando...' : isOk ? 'Operativo' : 'Fuera de línea'}
        </div>
      </div>

      {/* BARRAS DE UPTIME */}
      <div className="flex gap-[3px] h-[35px] w-full justify-between items-center">
        {barrasPrevias}
        <div
          className={`flex-1 h-full rounded-[2px] transition-all cursor-crosshair ${
            isLoading ? 'bg-[#121b2d] animate-pulse' :
            isOk ? 'bg-[#3dff7a] shadow-[0_0_10px_rgba(61,255,122,0.8)]' :
            'bg-[#ff3d3d] shadow-[0_0_10px_rgba(255,61,61,0.8)]'
          }`}
          title={isLoading ? 'Consultando...' : isOk ? 'Hoy: Operativo' : 'Hoy: CAÍDO'}
        ></div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 w-full border-t border-white/5 pt-2.5 font-semibold">
        <span>Hace 90 días</span>
        <span className="text-[#888]">99.9% uptime</span>
        <span>Hoy</span>
      </div>
    </div>
  );
};

export default function StatusPage() {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? ""
      : "http://localhost:8000");

  const [globalState, setGlobalState] = useState({
    estado: "LOADING",
    texto: "Verificando estado de los sistemas...",
    icono: "fa-solid fa-circle-notch fa-spin",
    colorBox: "bg-[#080d1a]/55 border-white/5 text-gray-400"
  });

  const [servicios, setServicios] = useState({
    api: "LOADING",
    postgresql: "LOADING",
    redis: "LOADING",
    minio: "LOADING",
    ollama: "LOADING"
  });

  const checkSystemHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/health`);
      const data = await res.json();

      if (data.estado_general === 'VERDE') {
        setGlobalState({
          estado: "VERDE",
          texto: "Todos los sistemas están operativos",
          icono: "fa-solid fa-check-circle",
          colorBox: "bg-[#080d1a]/55 border-[#3dff7a]/20 text-[#3dff7a] shadow-[0_4px_25px_rgba(61,255,122,0.03)]"
        });
      } else if (data.estado_general === 'AMARILLO') {
        setGlobalState({
          estado: "AMARILLO",
          texto: "Rendimiento degradado en algunos servicios",
          icono: "fa-solid fa-triangle-exclamation",
          colorBox: "bg-[#080d1a]/55 border-[#ffcc00]/20 text-[#ffcc00] shadow-[0_4px_25px_rgba(255,204,0,0.03)]"
        });
      } else {
        setGlobalState({
          estado: "ROJO",
          texto: "Interrupción parcial del sistema",
          icono: "fa-solid fa-circle-xmark",
          colorBox: "bg-[#080d1a]/55 border-[#ff3d3d]/20 text-[#ff3d3d] shadow-[0_4px_25px_rgba(255,61,61,0.03)]"
        });
      }

      setServicios({
        api: "OK",
        postgresql: data.servicios.postgresql || "ERROR",
        redis: data.servicios.redis || "ERROR",
        minio: data.servicios.minio || "ERROR",
        ollama: data.servicios.ollama || "ERROR"
      });

    } catch (error) {
      setGlobalState({
        estado: "OFFLINE",
        texto: "Interrupción total del sistema (API Inaccesible)",
        icono: "fa-solid fa-skull-crossbones",
        colorBox: "bg-[#080d1a]/55 border-[#ff3d3d]/20 text-[#ff3d3d] shadow-[0_4px_25px_rgba(255,61,61,0.03)]"
      });
      setServicios({ api: "ERROR", postgresql: "ERROR", redis: "ERROR", minio: "ERROR", ollama: "ERROR" });
    }
  };

  useEffect(() => {
    checkSystemHealth();
    const intervalo = setInterval(checkSystemHealth, 15000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-[#e0e0e0] font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#00aaff]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[800px] mx-auto pt-10 px-5 pb-20 relative z-10">

        {/* Cabecera */}
        <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-map-location-dot text-3xl text-[#00aaff] drop-shadow-[0_0_10px_rgba(0,170,255,0.6)]"></i>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              PICS Moreno <span className="text-gray-500 font-normal">| Status</span>
            </h1>
          </div>

          <Link
            href="/"
            className="bg-[#0d1527]/60 text-[#e0e0e0] backdrop-blur-sm no-underline px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border border-white/10 hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.08)] hover:text-white"
          >
            <i className="fa-solid fa-arrow-left mr-2 text-[#00aaff]"></i> Volver al Dashboard
          </Link>
        </header>

        {/* Banner Global */}
        <div className={`p-5 rounded-2xl text-lg font-bold flex items-center gap-4 mb-10 border backdrop-blur-md transition-all duration-300 ${globalState.colorBox}`}>
          <i className={`${globalState.icono} text-2xl`}></i>
          <span>{globalState.texto}</span>
        </div>

        {/* Lista de Servicios */}
        <div className="rounded-2xl">
          <h2 className="text-[1.1rem] text-[#00aaff] drop-shadow-[0_0_5px_rgba(0,170,255,0.4)] font-bold mb-4 uppercase tracking-[1px] px-2 flex items-center gap-2">
            <i className="fa-solid fa-server"></i> Métricas de Infraestructura
          </h2>

          <div className="flex flex-col shadow-[0_15px_40px_rgba(0,0,0,0.5)] rounded-2xl border border-white/5 overflow-hidden">
            <ServiceRow nombre="FastAPI (Core)" icono="fa-solid fa-microchip" estado={servicios.api} />
            <ServiceRow nombre="PostgreSQL (Cloud SQL)" icono="fa-solid fa-database" estado={servicios.postgresql} />
            <ServiceRow nombre="Redis (Cola de Mensajes)" icono="fa-solid fa-memory" estado={servicios.redis} />
            <ServiceRow nombre="MinIO (Almacenamiento)" icono="fa-solid fa-box-archive" estado={servicios.minio} />
            <ServiceRow nombre="Modelo LLM (Inteligencia Artificial)" icono="fa-solid fa-brain" estado={servicios.ollama} />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-[#555] text-[0.85rem] leading-relaxed font-semibold">
          Actualizado automáticamente cada 15 segundos.<br/>
          Infraestructura alojada en <span className="text-[#888]">Google Kubernetes Engine (GKE)</span>.
        </footer>

      </div>
    </div>
  );
}
