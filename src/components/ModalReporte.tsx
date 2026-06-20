"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Falla } from "../types";
import React from "react";
import { marked } from "marked";
import Swal from "sweetalert2";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  videoSeleccionado: number | null;
  metodo: "GET" | "POST";
  detecciones: any[];
  estadoReporte?: "idle" | "generando" | "error" | "listo";
  setEstadoReporte?: (estado: "idle" | "generando" | "error" | "listo") => void;
}

export default function ModalReporte({
  isOpen,
  onClose,
  videoSeleccionado,
  metodo,
  detecciones = [],
  estadoReporte,
  setEstadoReporte
}: Props) {
  const [estado, setEstado] = useState<"loading" | "stream" | "done" | "notfound" | "error">("loading");
  const [contenidoCrudo, setContenidoCrudo] = useState("");
  const [reporteConsultadoId, setReporteConsultadoId] = useState<number | null>(null);
  const [tramosConsultados, setTramosConsultados] = useState("");
  
  // Historial de reportes
  const [historial, setHistorial] = useState<any[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<any | null>(null);

  // Estados para selección múltiple de videos
  const [paso, setPaso] = useState<"seleccion" | "reporte">("reporte");
  const [videosSeleccionados, setVideosSeleccionados] = useState<number[]>([]);
  const [estadosVideos, setEstadosVideos] = useState<Record<number, string>>({});

  // Videos únicos con detecciones y filtrados por estado 'procesado', de mayor a menor
  const videosDisponibles = useMemo(() => {
    const ids = [...new Set(detecciones.filter((d: any) => d.video_id).map((d: any) => d.video_id))];
    const procesados = ids.filter((id) => {
      const est = estadosVideos[id];
      // Si el estado aún no se cargó, lo incluimos (para evitar pantallazos vacíos).
      // Si se cargó, solo incluimos si está procesado.
      return est === undefined || est === "procesado";
    });
    procesados.sort((a, b) => b - a);
    return procesados;
  }, [detecciones, estadosVideos]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? ""
      : "http://localhost:8000");

  // Cargar el historial al abrir el modal
  const cargarHistorial = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/reportes/historial`);
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  };

  // Cargar el estado de los videos en paralelo
  const cargarEstadosVideos = async (ids: number[]) => {
    try {
      const mapeados: Record<number, string> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`${API_URL}/api/v1/videos/${id}`);
            if (res.ok) {
              const data = await res.json();
              mapeados[id] = data.estado ? data.estado.toLowerCase() : "desconocido";
            } else {
              mapeados[id] = "error";
            }
          } catch {
            mapeados[id] = "error";
          }
        })
      );
      setEstadosVideos(mapeados);
    } catch (err) {
      console.error("Error al cargar estados de videos:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (estadoReporte === "generando" || estadoReporte === "listo") {
        if (estadoReporte === "listo") {
          setEstadoReporte?.("idle");
        }
        return;
      }

      if (estadoReporte === "error") {
        setEstadoReporte?.("idle");
      }

      setReporteSeleccionado(null);
      setContenidoCrudo("");
      setReporteConsultadoId(null);
      setTramosConsultados("");
      setEstadosVideos({});
      cargarHistorial();

      if (metodo === "POST") {
        setPaso("seleccion");
        
        const ids = [...new Set(detecciones.filter((d: any) => d.video_id).map((d: any) => d.video_id))];
        cargarEstadosVideos(ids);

        if (videoSeleccionado) {
          setVideosSeleccionados([videoSeleccionado]);
        } else {
          // Pre-seleccionar todos por defecto en reporte consolidado
          ids.sort((a, b) => b - a);
          setVideosSeleccionados(ids);
        }
      } else {
        setPaso("reporte");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cancelar peticiones activas únicamente al desmontar por completo
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (paso === "seleccion") return; // Si estamos en el paso de selección, no ejecutar la llamada aún
    if (reporteSeleccionado) return;

    setEstado("loading");

    // Abortar cualquier petición anterior si la hubiera
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const buscarGenerarReporte = async () => {
      try {
        let url = "";
        let opciones: any = { signal: abortControllerRef.current.signal };

        if (metodo === "POST") {
          url = `${API_URL}/api/v1/reportes/generar`;
          opciones.method = "POST";
          opciones.headers = { "Content-Type": "application/json" };
          // Filtrar videosSeleccionados para incluir únicamente aquellos cuyo estado sea 'procesado'
          const seleccionadosProcesados = videosSeleccionados.filter(id => videosDisponibles.includes(id));
          opciones.body = JSON.stringify({ video_ids: seleccionadosProcesados });
          setEstado("stream");
          setEstadoReporte?.("generando");
        } else {
          url = `${API_URL}/api/v1/reporte/${videoSeleccionado || 0}`;
          opciones.method = "GET";
        }

        const res = await fetch(url, opciones);

        if (res.status === 404 && metodo === "GET") {
          setEstado("notfound");
          return;
        }

        if (!res.ok) throw new Error("Error en servidor");

        if (metodo === "POST") {
          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let textoAcumulado = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            textoAcumulado += decoder.decode(value, { stream: true });
            setContenidoCrudo(textoAcumulado);

            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }

          setContenidoCrudo(textoAcumulado);
          setEstado("done");
          setEstadoReporte?.("listo");
          
          try {
            const histRes = await fetch(`${API_URL}/api/v1/reportes/historial`);
            if (histRes.ok) {
              const data = await histRes.json();
              setHistorial(data);
              if (data.length > 0) {
                setReporteSeleccionado(data[0]);
              }
            }
          } catch (err) {
            console.error("Error al recargar historial tras generar:", err);
          }
        } else {
          const data = await res.json();
          setReporteConsultadoId(data.reporte_id);
          setContenidoCrudo(data.contenido || "");
          setTramosConsultados(data.tramos || "");
          setEstado("done");
        }

      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error(error);
          setEstado("error");
          if (metodo === "POST") {
            setEstadoReporte?.("error");
          }
        }
      }
    };

    buscarGenerarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, videoSeleccionado, metodo, reporteSeleccionado, paso, videosSeleccionados]);

  // Reporte activo a visualizar (del historial o el cargado actual)
  const reporteActivo = useMemo(() => {
    if (reporteSeleccionado) {
      return {
        id: reporteSeleccionado.id,
        contenido: reporteSeleccionado.contenido,
        video_ids: reporteSeleccionado.video_ids,
        fecha: reporteSeleccionado.fecha_generacion,
        tramos: reporteSeleccionado.tramos
      };
    }
    return {
      id: reporteConsultadoId,
      contenido: contenidoCrudo,
      video_ids: videoSeleccionado ? [videoSeleccionado] : [],
      fecha: new Date().toISOString(),
      tramos: tramosConsultados
    };
  }, [reporteSeleccionado, contenidoCrudo, videoSeleccionado, reporteConsultadoId, tramosConsultados]);

  // Contenido markdown formateado
  const contenidoHTML = useMemo(() => {
    let raw = reporteActivo.contenido || "";
    // Asegurar formato h1 para el título del informe
    const tituloSinFormato = "INFORME TÉCNICO DE INSPECCIÓN VIAL - MORENO";
    if (raw.trim().startsWith(tituloSinFormato)) {
      raw = "# " + raw.trim();
    } else if (raw.trim().startsWith(`**${tituloSinFormato}**`)) {
      raw = `# ${tituloSinFormato}\n` + raw.trim().substring(tituloSinFormato.length + 4);
    }
    return marked.parse(raw) as string;
  }, [reporteActivo.contenido]);

  // Determinar los videos involucrados en el reporte activo
  const videoIdsActivos = useMemo(() => {
    return reporteActivo.video_ids || [];
  }, [reporteActivo.video_ids]);

  // Calcular las estadísticas en tiempo real (Opción B de lectura rápida)
  const statsReporte = useMemo(() => {
    const filtradas = detecciones.filter((d: any) => {
      // Si el reporte es global (array vacío), incluye todas las detecciones
      if (videoIdsActivos.length === 0) return true;
      return videoIdsActivos.includes(d.video_id);
    });

    const total = filtradas.length;
    const baches = filtradas.filter((d: any) => d.tipo_dano === "D40" || d.tipo_dano?.toLowerCase() === "bache").length;
    const grietas = filtradas.filter((d: any) => d.tipo_dano === "D20" || d.tipo_dano?.toLowerCase().includes("grieta")).length;

    let urgencia = "Leve";
    let urgenciaColor = "border-gray-800 text-gray-500 bg-gray-900/40";

    if (total > 20) {
      urgencia = "Crítica";
      urgenciaColor = "border-[#00d2ff]/40 text-[#00d2ff] bg-[#00d2ff]/10 shadow-[0_0_8px_rgba(0,210,255,0.15)]";
    } else if (total > 0) {
      urgencia = "Moderada";
      urgenciaColor = "border-[#00aaff]/30 text-[#00aaff]/80 bg-[#00aaff]/5";
    }

    return { total, baches, grietas, urgencia, urgenciaColor };
  }, [detecciones, videoIdsActivos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[2000] flex justify-center items-center">
      <style>{`
        @keyframes ia-loading { 0% { left: -30%; width: 30%; } 50% { width: 60%; } 100% { left: 100%; width: 30%; } }

        .swal2-container {
          z-index: 3000 !important;
        }

        /* ESTILOS DE LETRA AJUSTADOS Y MÁS COMPACTOS */
        .markdown-report h1 { color: #00aaff; font-size: 1.8rem; border-bottom: 1px solid #333; padding-bottom: 6px; margin: 18px 0 12px 0; text-shadow: 0 0 8px rgba(0,170,255,0.3); font-weight: bold; }
        .markdown-report h2 { color: #00aaff; font-size: 1.3rem; margin: 18px 0 8px 0; font-weight: bold; }
        .markdown-report h3 { color: #00aaff; font-size: 1.1rem; margin: 14px 0 6px 0; font-weight: bold; }
        .markdown-report p { margin-bottom: 12px; font-size: 0.9rem; line-height: 1.6; }
        .markdown-report ul { margin-left: 20px; margin-bottom: 12px; list-style-type: disc; font-size: 0.9rem; line-height: 1.6; }
        .markdown-report li { margin-bottom: 6px; }
        .markdown-report strong { color: #ffffff; font-weight: 700; letter-spacing: 0.2px; }
        .markdown-report table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85rem; background: #0a0a0a; border: 1px solid #222; border-radius: 6px; overflow: hidden; }
        .markdown-report th { background: #121212; color: #00aaff; padding: 8px 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #222; }
        .markdown-report td { padding: 8px 10px; border-bottom: 1px solid #111; color: #e0e0e0; }
        .markdown-report tr:hover { background: #1a1a1a/30; }
      `}</style>

      <div className="bg-[#0a0a0a] border border-[#00aaff] rounded-xl w-[80%] max-w-[950px] max-h-[85vh] flex flex-col shadow-[0_10px_40px_rgba(0,170,255,0.15)] overflow-hidden">

        {/* HEADER MODAL */}
        <div className="py-2.5 px-4 border-b border-[#222] flex justify-between items-center bg-[#121212] rounded-t-xl drop-shadow-[0_0_5px_rgba(0,170,255,0.2)] z-10">
          <h2 className="text-base font-bold text-[#00aaff] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,170,255,0.5)]">
            <i className="fa-solid fa-robot text-[1.1rem]"></i> Reporte de Inspección Inteligente
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className={`px-3 py-1 rounded border text-xs font-semibold flex items-center gap-1.5 transition-all
                ${mostrarHistorial 
                  ? 'bg-[#00aaff] text-black border-[#00aaff]' 
                  : 'bg-transparent text-gray-400 border-[#333] hover:text-white hover:border-gray-500'
                }`}
              title="Ver reportes anteriores"
            >
              <i className="fa-solid fa-clock-rotate-left"></i> Historial
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-[#00aaff] text-2xl leading-none hover:scale-110 transition-all">&times;</button>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        {paso === "reporte" && estado === "stream" && (
          <div className="w-full h-1 bg-[#333] relative overflow-hidden">
            <div className="absolute h-full bg-[#00aaff] shadow-[0_0_10px_#00aaff]" style={{ animation: 'ia-loading 1.5s infinite ease-in-out' }}></div>
          </div>
        )}
        {paso === "reporte" && estado === "done" && metodo === "POST" && (
          <div className="w-full h-1 bg-[#198754] shadow-[0_0_10px_#198754]"></div>
        )}

        <div className="flex flex-1 overflow-hidden">

          {/* BARRA LATERAL HISTORIAL */}
          {mostrarHistorial && (
            <div className="w-[250px] bg-[#121212]/50 border-r border-[#222] flex flex-col overflow-y-auto custom-scrollbar p-3 gap-2">
              <h3 className="text-xs text-[#00aaff] uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5 border-b border-[#222] pb-1.5">
                <i className="fa-solid fa-history"></i> Reportes Previos
              </h3>



              {historial.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-2">No hay reportes anteriores</p>
              ) : (
                historial.map((rep) => {
                  const esActual = reporteSeleccionado ? reporteSeleccionado.id === rep.id : rep.id === reporteConsultadoId;
                  const esGlobal = rep.video_ids.length === 0;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => { setReporteSeleccionado(rep); setPaso("reporte"); }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex flex-col gap-1
                        ${esActual 
                          ? 'border-[#00aaff] bg-[#00aaff]/5 text-white shadow-[0_0_8px_rgba(0,170,255,0.05)]' 
                          : 'border-[#222] bg-[#121212] text-gray-400 hover:border-gray-700 hover:text-white'
                        }`}
                    >
                      <div className="font-bold flex justify-between items-center">
                        <span>Reporte #{rep.id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] text-gray-500">{new Date(rep.fecha_generacion).toLocaleDateString('es-AR')}</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const resultado = await Swal.fire({
                                title: '¿Eliminar reporte?',
                                text: `Se eliminará permanentemente el Reporte #${rep.id}.`,
                                icon: 'warning',
                                iconColor: '#ff3d3d',
                                showCancelButton: true,
                                confirmButtonText: 'Sí, eliminar',
                                cancelButtonText: 'Cancelar',
                                background: '#0a0a0a',
                                color: '#e0e0e0',
                                confirmButtonColor: '#ff3d3d',
                                cancelButtonColor: '#222',
                                customClass: {
                                  popup: 'border border-[#222] rounded-xl',
                                  title: 'text-[#ff3d3d] font-bold text-lg',
                                  htmlContainer: 'text-gray-300 text-xs mt-2',
                                  confirmButton: 'bg-[#ff3d3d] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#ff6b6b] transition-all cursor-pointer mr-2',
                                  cancelButton: 'bg-[#222] border border-[#333] text-gray-300 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#333] transition-all cursor-pointer'
                                },
                                buttonsStyling: false
                              });

                              if (!resultado.isConfirmed) return;

                              try {
                                const res = await fetch(`${API_URL}/api/v1/reporte/${rep.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  if (reporteSeleccionado && reporteSeleccionado.id === rep.id) {
                                    setReporteSeleccionado(null);
                                  }
                                  if (reporteConsultadoId === rep.id) {
                                    setContenidoCrudo("");
                                    setReporteConsultadoId(null);
                                  }
                                  cargarHistorial();
                                  
                                  Swal.fire({
                                    title: 'Reporte Eliminado',
                                    text: 'El reporte fue eliminado correctamente de la base de datos.',
                                    icon: 'success',
                                    iconColor: '#00aaff',
                                    background: '#0a0a0a',
                                    color: '#e0e0e0',
                                    confirmButtonText: 'Aceptar',
                                    confirmButtonColor: '#00aaff',
                                    customClass: {
                                      popup: 'border border-[#222] rounded-xl',
                                      title: 'text-[#00aaff] font-bold text-lg',
                                      htmlContainer: 'text-gray-300 text-xs mt-2',
                                      confirmButton: 'bg-[#00aaff] text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-all cursor-pointer'
                                    },
                                    buttonsStyling: false
                                  });
                                } else {
                                  Swal.fire({
                                    title: 'Error',
                                    text: 'No se pudo eliminar el reporte del servidor.',
                                    icon: 'error',
                                    iconColor: '#ff3d3d',
                                    background: '#0a0a0a',
                                    color: '#e0e0e0',
                                    confirmButtonText: 'Aceptar',
                                    confirmButtonColor: '#00aaff',
                                    customClass: {
                                      popup: 'border border-[#222] rounded-xl',
                                      title: 'text-[#ff3d3d] font-bold text-lg',
                                      htmlContainer: 'text-gray-300 text-xs mt-2',
                                      confirmButton: 'bg-[#00aaff] text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white transition-all cursor-pointer'
                                    },
                                    buttonsStyling: false
                                  });
                                }
                              } catch (err) {
                                console.error("Error al eliminar reporte:", err);
                              }
                            }}
                            className="text-gray-500 hover:text-[#00aaff] transition-colors p-0.5"
                            title="Eliminar Reporte"
                          >
                            <i className="fa-solid fa-trash text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                      <div className="text-[0.7rem] text-gray-500 truncate">
                        {esGlobal ? 'Consolidado Municipal' : `Videos: #${rep.video_ids.join(', #')}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CONTENIDO PRINCIPAL */}
          {paso === "seleccion" ? (
            <div className="flex-1 flex flex-col justify-between p-6">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#00aaff] uppercase tracking-wider">Generar Nuevo Reporte de Inspección</h3>
                    <p className="text-xs text-gray-400 mt-1">Seleccioná uno o varios videos de la lista para consolidar sus datos y redactar el informe.</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (videosSeleccionados.length === videosDisponibles.length) {
                        setVideosSeleccionados([]);
                      } else {
                        setVideosSeleccionados([...videosDisponibles]);
                      }
                    }}
                    className="px-3 py-1 rounded border border-[#333] hover:border-gray-500 text-xs font-semibold text-gray-400 hover:text-white transition-all bg-transparent cursor-pointer"
                  >
                    {videosSeleccionados.length === videosDisponibles.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                  </button>
                </div>

                {videosDisponibles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-[#ffb86c] text-3xl mb-3"><i className="fa-solid fa-triangle-exclamation"></i></div>
                    <p className="text-gray-400 text-sm">No hay videos procesados con detecciones disponibles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {videosDisponibles.map((id) => {
                      const conteo = detecciones.filter((d: any) => d.video_id === id).length;
                      const estaSeleccionado = videosSeleccionados.includes(id);
                      
                      return (
                        <div
                          key={id}
                          onClick={() => {
                            if (estaSeleccionado) {
                              setVideosSeleccionados(videosSeleccionados.filter((vId) => vId !== id));
                            } else {
                              setVideosSeleccionados([...videosSeleccionados, id]);
                            }
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                            ${estaSeleccionado
                              ? 'border-[#00aaff] bg-[#00aaff]/5 text-white shadow-[0_0_8px_rgba(0,170,255,0.05)]'
                              : 'border-[#222] bg-[#121212] text-gray-400 hover:border-gray-700 hover:text-white'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={estaSeleccionado}
                              readOnly
                              className="accent-[#00aaff] cursor-pointer w-4 h-4 rounded border-[#333]"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">Video #{id}</span>
                              <span className="text-[0.7rem] text-gray-500">{conteo} {conteo === 1 ? 'detección' : 'detecciones'}</span>
                            </div>
                          </div>
                          <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold
                            ${conteo > 20
                              ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/50'
                              : conteo > 0
                                ? 'bg-[#00aaff]/10 text-[#00aaff]/80 border border-[#00aaff]/30'
                                : 'bg-[#222] text-gray-500'
                            }`}
                          >
                            {conteo > 20 ? 'Urgente' : conteo > 0 ? 'Media' : 'Estable'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-[#222] pt-4 mt-4 flex justify-end gap-3 bg-[#0a0a0a]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-[#333] hover:border-gray-500 text-xs font-bold text-gray-400 hover:text-white transition-all bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setReporteSeleccionado(null);
                    setContenidoCrudo("");
                    setPaso("reporte");
                  }}
                  disabled={videosSeleccionados.length === 0}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                    videosSeleccionados.length > 0
                      ? 'bg-gradient-to-r from-[#00aaff] to-[#0077cc] text-white shadow-[0_0_10px_rgba(0,170,255,0.3)] hover:shadow-[0_0_15px_rgba(0,170,255,0.5)] border-none cursor-pointer'
                      : 'bg-[#222] text-gray-600 border border-[#333] cursor-not-allowed'
                  }`}
                >
                  <i className="fa-solid fa-robot"></i> Generar Reporte de Inspección
                </button>
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto text-[#e0e0e0] text-sm leading-relaxed custom-scrollbar">

            {estado === "loading" && !reporteSeleccionado && (
              <div className="text-center py-12">
                <div className="text-[#00aaff] text-3xl mb-4 drop-shadow-[0_0_8px_rgba(0,170,255,0.6)]"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
                <div className="text-gray-300 text-sm font-semibold">Consultando la base de datos...</div>
              </div>
            )}

            {estado === "stream" && contenidoCrudo === "" && (
              <div className="text-[#00aaff] text-sm italic text-center py-10">
                <i className="fa-solid fa-plug fa-fade mr-2"></i> Analizando datos geográficos e inicializando Llama 3.2...
              </div>
            )}

            {estado === "notfound" && !reporteSeleccionado && (
              <div className="text-center py-12">
                <div className="text-[#ffb86c] text-4xl mb-4"><i className="fa-solid fa-folder-open"></i></div>
                <strong className="text-white text-lg block mb-2">No hay ningún reporte guardado.</strong>
                <span className="text-gray-400 text-sm">Usá el botón "Generar Nuevo Reporte" en la barra lateral para redactar uno.</span>
              </div>
            )}

            {estado === "error" && !reporteSeleccionado && (
              <div className="text-center py-12">
                <div className="text-[#ff3d3d] text-4xl mb-4 drop-shadow-[0_0_8px_rgba(255,61,61,0.5)]"><i className="fa-solid fa-triangle-exclamation"></i></div>
                <strong className="text-[#ff3d3d] text-lg block mb-2">Error de conexión con la IA</strong>
                <span className="text-gray-400 text-sm">Verificá los logs del servidor con Grafana.</span>
              </div>
            )}

            {/* KPI CARDS (Opción B de lectura rápida) */}
            {(estado === "stream" || estado === "done" || reporteSeleccionado) && reporteActivo.contenido && (() => {
              const tramosActivos = (() => {
                if (estado === "stream" && contenidoCrudo && !reporteSeleccionado) {
                  return "Calculando tramos al finalizar...";
                }
                return reporteActivo.tramos || "Sin recorrido identificado";
              })();
              
              return (
                <div>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    {/* Urgencia */}
                    <div className={`p-2.5 rounded-lg border text-center flex flex-col justify-center items-center ${statsReporte.urgenciaColor}`}>
                      <span className="text-[0.65rem] uppercase tracking-wider font-semibold opacity-70">Urgencia</span>
                      <strong className="text-sm font-bold mt-0.5">{statsReporte.urgencia}</strong>
                    </div>
                    {/* Baches */}
                    <div className="p-2.5 rounded-lg border border-[#222] bg-[#121212] text-center flex flex-col justify-center items-center">
                      <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Baches (D40)</span>
                      <strong className="text-sm font-bold text-gray-200 mt-0.5 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle text-[#00b8ff] text-[8px] shadow-[0_0_4px_#00b8ff]"></i> {statsReporte.baches}
                      </strong>
                    </div>
                    {/* Grietas */}
                    <div className="p-2.5 rounded-lg border border-[#222] bg-[#121212] text-center flex flex-col justify-center items-center">
                      <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Grietas (D20)</span>
                      <strong className="text-sm font-bold text-gray-200 mt-0.5 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle text-[#a3f7ff] text-[8px] shadow-[0_0_4px_#a3f7ff]"></i> {statsReporte.grietas}
                      </strong>
                    </div>
                    {/* Videos Involucrados */}
                    <div className="p-2.5 rounded-lg border border-[#222] bg-[#121212] text-center flex flex-col justify-center items-center">
                      <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold">Origen</span>
                      <strong 
                        className="text-xs font-semibold text-[#00aaff] truncate w-full mt-0.5 text-center" 
                        title={videoIdsActivos.length > 0 ? `Videos: #${videoIdsActivos.join(', #')}` : 'Consolidado Global'}
                      >
                        {videoIdsActivos.length > 0 ? `Videos #${videoIdsActivos.join(', #')}` : 'Consolidado Global'}
                      </strong>
                    </div>
                  </div>

                  {/* Card de Recorrido / Tramos */}
                  <div className="p-2.5 mb-6 rounded-lg border border-[#222] bg-[#121212] flex items-center gap-3">
                    <div className="bg-[#00aaff]/10 text-[#00aaff] p-2 rounded-lg border border-[#00aaff]/20 flex items-center justify-center">
                      <i className="fa-solid fa-route text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-semibold block">Tramos viales inspeccionados</span>
                      <strong className="text-xs font-semibold text-gray-200 truncate block mt-0.5" title={tramosActivos}>
                        {tramosActivos}
                      </strong>
                    </div>
                  </div>

                  {/* TEXTO INFORME EN MARKDOWN */}
                  <div className="markdown-report" dangerouslySetInnerHTML={{ __html: contenidoHTML }} />
                </div>
              );
            })()}

          </div>
        )}
        </div>
      </div>
    </div>
  );
}
