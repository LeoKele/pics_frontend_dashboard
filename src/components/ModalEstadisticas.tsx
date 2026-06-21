"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Falla } from "../types";

// 1. Agregamos la interfaz para decirle a TypeScript qué nos devuelve el backend
interface MetricasBackend {
  total: number;
  baches: number;
  grietas: number;
  tierras: number;
  verificadas: number;
  pendientes: number;
  falsos: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detecciones: Falla[]; // Detecciones activas del mapa (para armar la tendencia semestral)
}

export default function ModalEstadisticas({ isOpen, onClose, detecciones = [] }: Props) {
  // 2. Usamos el nuevo estado para las métricas
  const [metricas, setMetricas] = useState<MetricasBackend | null>(null);
  const [cargando, setCargando] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? ""
      : "http://localhost:8000");

  // 3. Hacemos el fetch al nuevo endpoint de métricas
  useEffect(() => {
    if (!isOpen) return;

    const fetchMetricas = async () => {
      setCargando(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/metricas`);
        if (!res.ok) throw new Error("Error al obtener métricas del servidor");
        const data: MetricasBackend = await res.json();
        setMetricas(data);
      } catch (err) {
        console.error("ModalEstadisticas: error al cargar métricas", err);
      } finally {
        setCargando(false);
      }
    };

    fetchMetricas();
  }, [isOpen]);

  // ─── TENDENCIA SEMESTRAL ─────────────────────────────────────────────────────
  // Se sigue calculando con la prop 'detecciones' que ya nos pasa el componente padre
  const cronogramaSemestral = useMemo(() => {
    const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const resultado = [];

    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const año = fechaMes.getFullYear();
      const mesIndex = fechaMes.getMonth();
      const nombre = `${nombresMeses[mesIndex]} ${año.toString().slice(-2)}`;

      const conteo = detecciones.filter((d) => {
        if (!d.fecha) return false;
        const fechaDeteccion = new Date(d.fecha);
        return (
          fechaDeteccion.getFullYear() === año &&
          fechaDeteccion.getMonth() === mesIndex
        );
      }).length;

      resultado.push({ nombre, conteo });
    }

    const maxVal = Math.max(...resultado.map((r) => r.conteo), 1);

    return resultado.map((r) => ({
      ...r,
      porcentaje: (r.conteo / maxVal) * 100,
    }));
  }, [detecciones]);

  if (!isOpen) return null;

  // Evitamos división por cero en las barras de porcentaje
  const totalAuditoria = metricas?.total || 1;

  return (
    <div className="fixed inset-0 bg-[#030712]/75 backdrop-blur-md z-[2000] flex justify-center items-center">
      <div className="bg-[#080d1a]/95 border border-white/5 rounded-2xl w-[90%] max-w-[800px] max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden hover:border-[#00aaff]/20 transition-all duration-500">

        {/* HEADER MODAL */}
        <div className="py-3 px-5 border-b border-white/5 flex justify-between items-center bg-[#0d1527]/60 backdrop-blur-sm rounded-t-2xl z-10">
          <h2 className="text-sm font-bold text-[#00aaff] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,170,255,0.4)]">
            <i className="fa-solid fa-chart-simple text-[1.1rem]"></i> Métricas Municipales Moreno
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[#00aaff] text-2xl leading-none hover:scale-110 transition-all">&times;</button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">

          {/* LOADING STATE */}
          {cargando ? (
            <div className="flex-1 flex items-center justify-center text-[#00aaff] text-sm gap-2 min-h-[300px]">
              <i className="fa-solid fa-circle-notch fa-spin"></i> Cargando métricas consolidadas...
            </div>
          ) : (
            <>
              {/* KPI CARDS */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0d1527]/40 border border-white/5 rounded-xl p-3 text-center hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.05)] transition-all duration-300 shadow-sm">
                  <span className="text-[0.65rem] text-gray-400 uppercase tracking-wider font-semibold">Total Hallazgos</span>
                  <strong className="text-xl font-bold text-white block mt-1">{metricas?.total || 0}</strong>
                </div>
                <div className="bg-[#0d1527]/40 border border-white/5 rounded-xl p-3 text-center hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.05)] transition-all duration-300 shadow-sm">
                  <span className="text-[0.65rem] text-gray-400 uppercase tracking-wider font-semibold">Baches (D40)</span>
                  <strong className="text-xl font-bold text-[#00b8ff] block mt-1">{metricas?.baches || 0}</strong>
                </div>
                <div className="bg-[#0d1527]/40 border border-white/5 rounded-xl p-3 text-center hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.05)] transition-all duration-300 shadow-sm">
                  <span className="text-[0.65rem] text-gray-400 uppercase tracking-wider font-semibold">Grietas (D20)</span>
                  <strong className="text-xl font-bold text-[#a3f7ff] block mt-1">{metricas?.grietas || 0}</strong>
                </div>
                <div className="bg-[#0d1527]/40 border border-white/5 rounded-xl p-3 text-center hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.05)] transition-all duration-300 shadow-sm">
                  <span className="text-[0.65rem] text-gray-400 uppercase tracking-wider font-semibold">Tramos de Tierra</span>
                  <strong className="text-xl font-bold text-[#ffb86c] block mt-1">{metricas?.tierras || 0}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* SECCIÓN ESTADO AUDITORÍA */}
                <div className="bg-[#0d1527]/25 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-[#00aaff]/20 transition-all duration-300">
                  <h3 className="text-xs text-[#00aaff] uppercase tracking-wider font-bold mb-4 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-clipboard-check"></i> Auditoría de Detecciones
                  </h3>

                  <div className="flex flex-col gap-3.5 my-auto">
                    {/* Barra Verificados */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Verificadas</span>
                        <span className="text-[#00aaff]">
                          {metricas?.verificadas || 0} ({(((metricas?.verificadas || 0) / totalAuditoria) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#030912] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00aaff] rounded-full" style={{ width: `${((metricas?.verificadas || 0) / totalAuditoria) * 100}%` }}></div>
                      </div>
                    </div>

                    {/* Barra Pendientes */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Pendientes</span>
                        <span className="text-[#a3f7ff]">
                          {metricas?.pendientes || 0} ({(((metricas?.pendientes || 0) / totalAuditoria) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#030912] rounded-full overflow-hidden">
                        <div className="h-full bg-[#a3f7ff] rounded-full" style={{ width: `${((metricas?.pendientes || 0) / totalAuditoria) * 100}%` }}></div>
                      </div>
                    </div>

                    {/* Barra Falsos Positivos */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-400">Falsos Positivos</span>
                        <span className="text-[#88b4d9]">
                          {metricas?.falsos || 0} ({(((metricas?.falsos || 0) / totalAuditoria) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#030912] rounded-full overflow-hidden">
                        <div className="h-full bg-[#88b4d9] rounded-full" style={{ width: `${((metricas?.falsos || 0) / totalAuditoria) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TENDENCIA SEMESTRAL */}
                <div className="bg-[#0d1527]/25 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-[#00aaff]/20 transition-all duration-300">
                  <h3 className="text-xs text-[#00aaff] uppercase tracking-wider font-bold mb-4 border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-chart-line"></i> Tendencia (Últimos 6 meses)
                  </h3>

                  <div className="flex items-end justify-between h-[110px] px-2 pt-2.5">
                    {cronogramaSemestral.map((mes, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 group flex-1">
                        <div className="relative w-4 bg-[#030912] rounded-t-sm h-[80px] flex items-end">
                          <div
                            className="w-full bg-[#00aaff] hover:bg-white transition-all rounded-t-sm shadow-[0_0_8px_rgba(0,170,255,0.4)]"
                            style={{ height: `${mes.porcentaje}%` }}
                            title={`${mes.conteo} detecciones`}
                          ></div>
                          <span className="absolute -top-6 bg-black border border-white/5 text-white font-bold text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {mes.conteo}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold">{mes.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="py-3.5 px-5 border-t border-white/5 flex justify-end bg-[#0d1527]/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/10 hover:border-[#00aaff]/40 text-xs font-bold text-gray-400 hover:text-white transition-all bg-transparent cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(0,170,255,0.15)]"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}