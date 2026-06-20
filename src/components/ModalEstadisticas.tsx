"use client";
import React, { useMemo } from "react";
import { Falla } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  detecciones: Falla[];
}

export default function ModalEstadisticas({ isOpen, onClose, detecciones = [] }: Props) {
  // 1. Filtrar los falsos positivos para las estadísticas de daños reales, pero conservarlos para la auditoría
  const deteccionesReales = useMemo(() => {
    return detecciones.filter((d) => d.estado_auditoria !== "falso_positivo");
  }, [detecciones]);

  const stats = useMemo(() => {
    const total = deteccionesReales.length;
    const baches = deteccionesReales.filter((d) => d.tipo_dano === "D40").length;
    const grietas = deteccionesReales.filter((d) => d.tipo_dano === "D20").length;
    const tierras = deteccionesReales.filter((d) => d.tipo_dano === "calle_tierra").length;

    // Auditoría
    const verificadas = detecciones.filter((d) => d.estado_auditoria === "verificado").length;
    const pendientes = detecciones.filter((d) => d.estado_auditoria === "pendiente").length;
    const falsos = detecciones.filter((d) => d.estado_auditoria === "falso_positivo").length;

    return { total, baches, grietas, tierras, verificadas, pendientes, falsos };
  }, [detecciones, deteccionesReales]);

  // 2. Agrupación por mes (Últimos 6 meses dinámicos)
  const cronogramaSemestral = useMemo(() => {
    const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const resultado = [];

    // Generar los últimos 6 meses en orden cronológico
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const año = fechaMes.getFullYear();
      const mesIndex = fechaMes.getMonth();
      const nombre = `${nombresMeses[mesIndex]} ${año.toString().slice(-2)}`;
      
      // Contar detecciones reales en este mes
      const conteo = deteccionesReales.filter((d) => {
        if (!d.fecha) return false;
        const fechaDeteccion = new Date(d.fecha);
        return (
          fechaDeteccion.getFullYear() === año &&
          fechaDeteccion.getMonth() === mesIndex
        );
      }).length;

      resultado.push({ nombre, conteo });
    }

    // Buscar valor máximo para escalar las barras verticalmente
    const maxVal = Math.max(...resultado.map((r) => r.conteo), 1);

    return resultado.map((r) => ({
      ...r,
      porcentaje: (r.conteo / maxVal) * 100,
    }));
  }, [deteccionesReales]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[2000] flex justify-center items-center">
      <div className="bg-[#0a0a0a] border border-[#00aaff] rounded-xl w-[90%] max-w-[800px] max-h-[85vh] flex flex-col shadow-[0_10px_40px_rgba(0,170,255,0.15)] overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="py-2.5 px-4 border-b border-[#222] flex justify-between items-center bg-[#121212] rounded-t-xl z-10">
          <h2 className="text-base font-bold text-[#00aaff] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,170,255,0.5)]">
            <i className="fa-solid fa-chart-simple text-[1.1rem]"></i> Métricas Municipales Moreno
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[#00aaff] text-2xl leading-none hover:scale-110 transition-all">&times;</button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#121212] border border-[#222] rounded-lg p-3 text-center">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Total Hallazgos</span>
              <strong className="text-xl font-bold text-white block mt-1">{stats.total}</strong>
            </div>
            <div className="bg-[#121212] border border-[#222] rounded-lg p-3 text-center">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Baches (D40)</span>
              <strong className="text-xl font-bold text-[#00b8ff] block mt-1">{stats.baches}</strong>
            </div>
            <div className="bg-[#121212] border border-[#222] rounded-lg p-3 text-center">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Grietas (D20)</span>
              <strong className="text-xl font-bold text-[#a3f7ff] block mt-1">{stats.grietas}</strong>
            </div>
            <div className="bg-[#121212] border border-[#222] rounded-lg p-3 text-center">
              <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Tramos de Tierra</span>
              <strong className="text-xl font-bold text-[#ffb86c] block mt-1">{stats.tierras}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* SECCIÓN ESTADO AUDITORÍA */}
            <div className="bg-[#121212]/30 border border-[#222] rounded-xl p-4 flex flex-col justify-between">
              <h3 className="text-xs text-[#00aaff] uppercase tracking-wider font-bold mb-4 border-b border-[#222] pb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-clipboard-check"></i> Auditoría de Detecciones
              </h3>

              <div className="flex flex-col gap-3.5 my-auto">
                {/* Barra Verificados */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">Verificadas</span>
                    <span className="text-[#3dff7a]">{stats.verificadas} ({stats.total > 0 ? ((stats.verificadas / (detecciones.length || 1)) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3dff7a] rounded-full" style={{ width: `${stats.total > 0 ? (stats.verificadas / (detecciones.length || 1)) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Barra Pendientes */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">Pendientes</span>
                    <span className="text-[#ffcc00]">{stats.pendientes} ({stats.total > 0 ? ((stats.pendientes / (detecciones.length || 1)) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ffcc00] rounded-full" style={{ width: `${stats.total > 0 ? (stats.pendientes / (detecciones.length || 1)) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Barra Falsos Positivos */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-400">Falsos Positivos</span>
                    <span className="text-[#ff3d3d]">{stats.falsos} ({stats.total > 0 ? ((stats.falsos / (detecciones.length || 1)) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff3d3d] rounded-full" style={{ width: `${stats.total > 0 ? (stats.falsos / (detecciones.length || 1)) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* TENDENCIA SEMESTRAL */}
            <div className="bg-[#121212]/30 border border-[#222] rounded-xl p-4 flex flex-col justify-between">
              <h3 className="text-xs text-[#00aaff] uppercase tracking-wider font-bold mb-4 border-b border-[#222] pb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-chart-line"></i> Tendencia (Últimos 6 meses)
              </h3>

              <div className="flex items-end justify-between h-[110px] px-2 pt-2.5">
                {cronogramaSemestral.map((mes, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 group flex-1">
                    <div className="relative w-4 bg-[#222] rounded-t-sm h-[80px] flex items-end">
                      {/* Barra de Progreso Vertical */}
                      <div
                        className="w-full bg-[#00aaff] hover:bg-white transition-all rounded-t-sm shadow-[0_0_8px_rgba(0,170,255,0.4)]"
                        style={{ height: `${mes.porcentaje}%` }}
                        title={`${mes.conteo} detecciones`}
                      ></div>
                      {/* Tooltip */}
                      <span className="absolute -top-6 bg-black border border-[#333] text-white font-bold text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {mes.conteo}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-semibold">{mes.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER MODAL */}
        <div className="py-3 px-4 border-t border-[#222] flex justify-end bg-[#121212] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#333] hover:border-gray-500 text-xs font-bold text-gray-400 hover:text-white transition-all bg-transparent cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
