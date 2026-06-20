"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Falla } from "../types";
import FotoDeteccion from "./FotoDeteccion";
import ChatIA from "./ChatIA";
import ModalReporte from "./ModalReporte";
import ModalEstadisticas from "./ModalEstadisticas";
import Link from "next/link";

const MapaVial = dynamic(() => import("./MapaVial"), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-full text-[#00aaff]"><i className="fa-solid fa-circle-notch fa-spin text-4xl"></i></div>
});

interface DashboardProps {
  rol: string;
  onLogout: () => void;
}

export default function Dashboard({ rol, onLogout }: DashboardProps) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? ""
      : "http://localhost:8000");
  const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || "http://localhost:3000";

  const [stats, setStats] = useState({ baches: 0, videos: 0 });
  const [listaVideos, setListaVideos] = useState<any[]>([]);
  const [videoSeleccionado, setVideoSeleccionado] = useState<number | null>(null);
  const [deteccionesTotales, setDeteccionesTotales] = useState<Falla[]>([]);
  const [fallaSeleccionada, setFallaSeleccionada] = useState<Falla | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [metodoModal, setMetodoModal] = useState<"GET" | "POST">("GET");
  const [trayectorias, setTrayectorias] = useState({});
  const [estadoSistema, setEstadoSistema] = useState("LOADING");
  const [estadoReporte, setEstadoReporte] = useState<"idle" | "generando" | "error" | "listo">("idle");
  const [modalEstadisticasAbierto, setModalEstadisticasAbierto] = useState(false);

  // Configuración del umbral de confianza interactivo
  const [umbralConfianza, setUmbralConfianza] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("umbral_confianza");
      return guardado ? parseFloat(guardado) : 0.3;
    }
    return 0.3;
  });

  useEffect(() => {
    localStorage.setItem("umbral_confianza", umbralConfianza.toString());
  }, [umbralConfianza]);

  // Filtro de clases/tipos de falla interactivo
  const [filtrosClases, setFiltrosClases] = useState<Record<string, boolean>>({
    "D40": true,
    "D20": true,
    "calle_tierra": true,
  });

  // Filtrar detecciones en tiempo real (por confianza y tipo de daño)
  const deteccionesFiltradas = useMemo(() => {
    return deteccionesTotales.filter((d: any) => {
      const pasaConfianza = d.confianza >= umbralConfianza;
      const pasaClase = filtrosClases[d.tipo_dano] !== false;
      return pasaConfianza && pasaClase;
    });
  }, [deteccionesTotales, umbralConfianza, filtrosClases]);

  // Sincronizar estadísticas cuando cambien las detecciones totales o el filtro
  useEffect(() => {
    const idsUnicos = [...new Set(deteccionesTotales.filter((d: any) => d.video_id).map((d: any) => d.video_id))];
    setStats({ baches: deteccionesFiltradas.length, videos: idsUnicos.length });
  }, [deteccionesTotales, deteccionesFiltradas]);

  const volverGlobal = () => {
    setVideoSeleccionado(null);
    setFallaSeleccionada(null);
  };

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/detecciones?v=${new Date().getTime()}`);
      if (!res.ok) return;
      const detecciones = await res.json();

      setDeteccionesTotales(detecciones);
      try {
        const resTrayectos = await fetch(`${API_URL}/api/v1/trayectorias?v=${new Date().getTime()}`);
        if (resTrayectos.ok) {
          const trayectoriasReales = await resTrayectos.json();
          setTrayectorias(trayectoriasReales);
        }
      } catch (errTrayectos) {
        console.warn("No se pudo cargar la telemetría:", errTrayectos);
      }

      try {
        const resHealth = await fetch(`${API_URL}/api/v1/health?v=${new Date().getTime()}`);
        if (resHealth.ok) {
          const dataHealth = await resHealth.json();
          setEstadoSistema(dataHealth.estado_general);
        } else {
          setEstadoSistema("ROJO");
        }
      } catch (errHealth) {
        setEstadoSistema("ROJO");
      }

      const idsUnicos = [...new Set(detecciones.filter((d: any) => d.video_id).map((d: any) => d.video_id))];

      const videosActualizados = await Promise.all(
        idsUnicos.map(async (id) => {
          try {
            const vRes = await fetch(`${API_URL}/api/v1/videos/${id}`);
            const vData = await vRes.json();
            return { 
              id, 
              estado: vData.estado ? vData.estado.toUpperCase() : "DESCONOCIDO",
              detecciones_count: vData.detecciones_count ?? 0
            };
          } catch {
            return { id, estado: "ERROR", detecciones_count: 0 };
          }
        })
      );

      setListaVideos(videosActualizados);
    } catch (error) {
      console.error("Error conectando a la API:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 15000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#030712] text-[#e0e0e0] font-sans">

      {/* HEADER */}
      <header className="bg-[#080d1a]/85 backdrop-blur-md px-4 flex justify-between items-center border-b border-white/5 h-[55px] shadow-[0_4px_20px_rgba(0,170,255,0.03)] z-10">
        <h1 className="text-lg sm:text-xl text-white flex items-center gap-2 font-bold tracking-wide">
          <i className="fa-solid fa-map-location-dot text-[#00aaff] drop-shadow-[0_0_8px_rgba(0,170,255,0.6)]"></i> PICS Moreno
        </h1>

        <div className="flex items-center gap-3">
          {rol === 'admin' && (
            <a
              href={`${GRAFANA_URL}/explore?left=%5B%22now-1h%22%2C%22now%22%2C%22Loki%22%2C%7B%22expr%22%3A%22%7Bservice%3D%5C%22api_fastapi%5C%22%7D%22%7D%5D`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0d1527]/60 text-[#e0e0e0] border border-white/5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-[#111c33]/70 hover:border-[#00aaff]/40 hover:text-white transition-all duration-300 no-underline shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_8px_rgba(0,170,255,0.15)]"
            >
              <i className="fa-solid fa-terminal text-[#00aaff] drop-shadow-[0_0_5px_rgba(0,170,255,0.4)]"></i> Ver Logs
            </a>
          )}

          <button
            onClick={() => setModalEstadisticasAbierto(true)}
            className="bg-[#0d1527]/60 text-[#e0e0e0] border border-white/5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-[#111c33]/70 hover:border-[#00aaff]/40 hover:text-white transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_8px_rgba(0,170,255,0.15)]"
          >
            <i className="fa-solid fa-chart-simple text-[#00aaff] drop-shadow-[0_0_5px_rgba(0,170,255,0.4)]"></i> Métricas
          </button>

          <Link
            href="/status"
            className="bg-[#0d1527]/60 px-3.5 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer hover:bg-[#111c33]/70 hover:border-[#00aaff]/40 hover:text-white transition-all duration-300 no-underline shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_0_8px_rgba(0,170,255,0.15)]"
          >
            <div className={`w-3 h-3 rounded-full bg-[#00aaff] shadow-[0_0_8px_#00aaff] ${estadoSistema === 'LOADING' ? 'animate-pulse' : ''}`}></div>
            <span>
              {estadoSistema === 'VERDE' ? 'Sistemas OK' :
               estadoSistema === 'AMARILLO' ? 'Advertencia' :
               estadoSistema === 'ROJO' ? 'Falla Crítica' : 'Consultando...'}
            </span>
          </Link>

          <div className="bg-[#0d1527]/60 px-3.5 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5 text-xs sm:text-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <i className="fa-solid fa-user-tie text-[#00aaff]"></i>
            <span>{rol === 'admin' ? 'Administrador' : 'Operador'}</span>
            <button onClick={onLogout} className="text-gray-400 hover:text-[#ff3d3d] ml-2 transition-colors text-sm cursor-pointer" title="Cerrar Sesión">
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden relative z-0">

        <aside className="w-[260px] bg-[#060a13]/70 backdrop-blur-lg p-3.5 border-r border-white/5 flex flex-col gap-3.5 overflow-y-auto z-10 shadow-[4px_0_30px_rgba(0,0,0,0.4)]">

          <div className="bg-[#0d1527]/40 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/5 hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.08)] transition-all duration-300">
            <div className="text-2xl font-bold text-[#00aaff] drop-shadow-[0_0_8px_rgba(0,170,255,0.6)]">{stats.baches}</div>
            <div className="text-[0.65rem] text-gray-400 uppercase tracking-widest mt-1 font-semibold">Detecciones</div>
          </div>
          <div className="bg-[#0d1527]/40 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/5 hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.08)] transition-all duration-300">
            <div className="text-2xl font-bold text-[#00aaff] drop-shadow-[0_0_8px_rgba(0,170,255,0.6)]">{stats.videos}</div>
            <div className="text-[0.65rem] text-gray-400 uppercase tracking-widest mt-1 font-semibold">Videos Subidos</div>
          </div>

          {/* CONTROL DE UMBRAL DE CONFIANZA INTERACTIVO */}
          <div className="bg-[#0d1527]/40 backdrop-blur-sm rounded-xl p-3 border border-white/5 hover:border-[#00aaff]/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,170,255,0.08)] transition-all duration-300 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-gray-300">
              <span><i className="fa-solid fa-sliders text-[#00aaff] mr-1.5"></i> Umbral Confianza</span>
              <span className="text-[#00aaff] bg-[#00aaff]/10 px-1.5 py-0.5 rounded border border-[#00aaff]/30">{(umbralConfianza * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="1.00"
              step="0.05"
              value={umbralConfianza}
              onChange={(e) => setUmbralConfianza(parseFloat(e.target.value))}
              className="w-full accent-[#00aaff] cursor-pointer h-1 bg-[#222] rounded-lg appearance-none"
            />
            <span className="text-[0.6rem] text-gray-500 text-center">Filtrar detecciones por precisión</span>
          </div>

          <h3 className="text-sm text-[#00aaff] mt-1 uppercase tracking-wide font-bold flex items-center drop-shadow-[0_0_5px_rgba(0,170,255,0.4)]">
            <i className="fa-solid fa-clock-rotate-left mr-2"></i> Historial
          </h3>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 custom-scrollbar pr-1">
            {listaVideos.length === 0 ? (
              <p className="text-gray-500 text-xs italic">Sistema en espera...</p>
            ) : (
              listaVideos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => {
                    setVideoSeleccionado(vid.id);
                    setFallaSeleccionada(null);}}
                  className={`bg-[#0d1527]/30 backdrop-blur-sm rounded-lg p-2 border-l-[4px] cursor-pointer hover:-translate-y-[1px] transition-all duration-300 text-xs sm:text-sm flex flex-col gap-1 shadow-sm
                    ${videoSeleccionado === vid.id ? 'border-[#00aaff] bg-[#111c33]/55 shadow-[0_0_12px_rgba(0,170,255,0.15)]' : 'border-transparent hover:border-[#00aaff]/30 hover:bg-[#0d1527]/50'}`}
                >
                  <div className="font-bold text-gray-200 flex justify-between items-center">
                    <span><i className="fa-solid fa-film text-[#00aaff] opacity-80 mr-2"></i> Video #{vid.id}</span>
                    {vid.estado === 'PROCESADO' && (
                      <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-bold
                        ${vid.detecciones_count > 20
                          ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/50 shadow-[0_0_8px_rgba(0,210,255,0.2)]'
                          : vid.detecciones_count > 0
                            ? 'bg-[#00aaff]/10 text-[#00aaff]/80 border border-[#00aaff]/30'
                            : 'bg-[#222] text-gray-500 border border-transparent'
                        }`}
                      >
                        {vid.detecciones_count > 20 ? 'Urgente' : vid.detecciones_count > 0 ? 'Media' : 'Estable'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full
                      ${vid.estado === 'PROCESADO' ? 'bg-[#00aaff]/15 text-[#00aaff]/80 border border-[#00aaff]/30' :
                        vid.estado === 'PENDIENTE' ? 'bg-[#222] text-gray-500 border border-[#333]' :
                        'bg-[#00aaff]/10 text-[#00aaff] border border-[#00aaff]/30 animate-pulse'}`}>
                      {vid.estado === 'PENDIENTE' ? <i className="fa-solid fa-clock mr-1"></i> : vid.estado === 'PROCESADO' ? <i className="fa-solid fa-check mr-1"></i> : <i className="fa-solid fa-circle-notch fa-spin mr-1"></i>} {vid.estado}
                    </span>
                    {vid.estado === 'PROCESADO' && (
                      <span className="text-[0.7rem] text-gray-400">
                        {vid.detecciones_count} {vid.detecciones_count === 1 ? 'detección' : 'detecciones'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setMetodoModal("GET"); setModalAbierto(true); }}
              disabled={listaVideos.length === 0}
              className={`w-full p-2.5 rounded-lg font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 transition-all duration-300 ${
                listaVideos.length > 0
                  ? 'bg-gradient-to-r from-[#00aaff] to-[#0077cc] text-white shadow-[0_0_10px_rgba(0,170,255,0.3)] hover:shadow-[0_0_15px_rgba(0,170,255,0.5)] border-none cursor-pointer'
                  : 'bg-[#0d1527]/40 text-gray-600 border border-white/5 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-file-lines"></i> {videoSeleccionado ? `Ver Reporte (#${videoSeleccionado})` : 'Ver Reporte Consolidado'}
            </button>

            <button
              onClick={() => { setMetodoModal("POST"); setModalAbierto(true); }}
              disabled={listaVideos.length === 0}
              className={`w-full border p-2.5 rounded-lg font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 transition-all duration-300 ${
                listaVideos.length > 0
                  ? 'bg-[#060a13]/70 border-[#00aaff] text-[#00aaff] shadow-[0_0_10px_rgba(0,170,255,0.2)] hover:bg-[#111c33]/50 hover:shadow-[0_0_15px_rgba(0,170,255,0.4)] cursor-pointer'
                  : 'bg-[#0d1527]/30 border-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-robot"></i> {videoSeleccionado ? 'Generar Reporte IA' : 'Generar Reporte Global IA'}
            </button>
          </div>
        </aside>

        {/* CONTENIDO CENTRAL */}
        <main className="flex-1 grid grid-cols-3 grid-rows-3 gap-5 p-5 bg-[#030712]">

           {/* MAPA */}
           <div className="col-span-2 row-span-2 bg-[#080d1a]/55 backdrop-blur-md border border-white/5 hover:border-[#00aaff]/30 hover:shadow-[0_8px_30px_rgba(0,170,255,0.03)] transition-all duration-300 rounded-xl flex items-center justify-center flex-col relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
             <MapaVial
               detecciones={deteccionesFiltradas}
               trayectorias={trayectorias}
               onSeleccionarVideo={setVideoSeleccionado}
               onSeleccionarFalla={setFallaSeleccionada}
               filtrosClases={filtrosClases}
               setFiltrosClases={setFiltrosClases}
             />
           </div>

           {/* FOTO */}
           <div className="col-span-1 row-span-2 bg-[#080d1a]/55 backdrop-blur-md border border-white/5 hover:border-[#00aaff]/30 hover:shadow-[0_8px_30px_rgba(0,170,255,0.03)] transition-all duration-300 rounded-xl p-4 flex flex-col text-gray-300 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
             <div className="font-bold text-[#00aaff] border-b border-white/5 text-base pb-2 mb-3 flex justify-between items-center drop-shadow-[0_0_5px_rgba(0,170,255,0.3)]">
                <span><i className="fa-solid fa-magnifying-glass-location mr-2"></i> Inspección Técnica</span>
                {videoSeleccionado && <span className="bg-[#111c33]/70 text-white text-xs px-2 py-1 rounded-md border border-white/10">Video #{videoSeleccionado}</span>}
             </div>

             <FotoDeteccion
               videoSeleccionado={videoSeleccionado}
               falla={fallaSeleccionada}
               onAuditoriaCompletada={() => {
                 cargarDatos();
                 setFallaSeleccionada(null);
               }}
             />
           </div>

           {/* KEDA */}
           <div className="col-span-2 row-span-1 bg-[#080d1a]/55 backdrop-blur-md border border-white/5 hover:border-[#00aaff]/30 hover:shadow-[0_8px_30px_rgba(0,170,255,0.03)] transition-all duration-300 rounded-xl p-4 flex flex-col text-gray-300 overflow-y-auto shadow-[0_8px_30px_rgba(0,0,0,0.5)] custom-scrollbar">
             <div className="font-bold text-[#00aaff] border-b border-white/5 text-base pb-2 mb-3 flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(0,170,255,0.3)]">
                <i className="fa-solid fa-stopwatch mr-1"></i> Estado del Sistema KEDA
             </div>
             <div className="flex flex-col gap-2">
                {estadoReporte !== "idle" && (
                   <div 
                     onClick={() => { setMetodoModal("POST"); setModalAbierto(true); }}
                     className="bg-[#111c33]/40 p-2 rounded-lg border border-[#00aaff]/30 flex justify-between items-center text-xs sm:text-sm shadow-sm hover:bg-[#111c33]/70 hover:border-[#00aaff]/60 transition-all duration-300 cursor-pointer"
                   >
                     <strong className="text-gray-300">
                       <i className="fa-solid fa-robot text-[#00aaff]/70 mr-3"></i>
                       Generando Reporte Ejecutivo IA
                     </strong>
                     <span className={`font-bold tracking-wide flex items-center gap-1.5 ${
                       estadoReporte === 'generando'
                         ? 'text-[#00aaff]/60 animate-pulse'
                         : estadoReporte === 'error'
                           ? 'text-[#ff3d3d] drop-shadow-[0_0_5px_rgba(255,61,61,0.5)]'
                           : 'text-[#00d2ff] drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]'
                     }`}>
                       {estadoReporte === 'generando' ? (
                         <>
                           <i className="fa-solid fa-circle-notch fa-spin"></i>
                           GENERANDO...
                         </>
                       ) : estadoReporte === 'error' ? (
                         <>
                           <i className="fa-solid fa-circle-exclamation"></i>
                           ERROR
                         </>
                       ) : (
                         <>
                           <i className="fa-solid fa-circle-check"></i>
                           LISTO
                         </>
                       )}
                     </span>
                   </div>
                 )}
                {listaVideos.length === 0 ? <p className="text-xs italic text-gray-600">En espera de procesamiento de video...</p> : (
                  listaVideos.map(vid => (
                    <div key={`cola-${vid.id}`} className="bg-[#0d1527]/30 p-2 rounded-lg border border-white/5 flex justify-between items-center text-xs sm:text-sm shadow-sm hover:bg-[#111c33]/55 transition-colors">
                      <strong className="text-gray-300"><i className="fa-solid fa-film text-[#00aaff]/70 mr-3"></i>Video #{vid.id}</strong>
                      <span className={`font-bold tracking-wide ${
                        vid.estado === 'PROCESADO'
                          ? 'text-[#00aaff] drop-shadow-[0_0_5px_rgba(0,170,255,0.5)]'
                          : 'text-[#00aaff]/60 animate-pulse'
                      }`}>
                        {vid.estado}
                      </span>
                    </div>
                  ))
                )}
             </div>
           </div>

           {/* CHAT */}
           <div className="col-span-1 row-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden">
             <ChatIA
                videoSeleccionado={videoSeleccionado}
                onVolverGlobal={volverGlobal}
             />
           </div>

        </main>
      </div>

      <ModalReporte
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        videoSeleccionado={videoSeleccionado}
        metodo={metodoModal}
        detecciones={deteccionesTotales}
        estadoReporte={estadoReporte}
        setEstadoReporte={setEstadoReporte}
      />

      <ModalEstadisticas
        isOpen={modalEstadisticasAbierto}
        onClose={() => setModalEstadisticasAbierto(false)}
        detecciones={deteccionesTotales}
      />
    </div>
  );
}
