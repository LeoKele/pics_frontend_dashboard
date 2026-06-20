"use client";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const obtenerEstilosFalla = (tipo_dano: string) => {
  let color = "#00aaff"; // Azul celeste por defecto
  let nombre = tipo_dano;
  
  if (tipo_dano === "D40" || tipo_dano?.toLowerCase() === "bache") {
    color = "#00b8ff"; // Celeste brillante / eléctrico
    nombre = "Bache";
  } else if (tipo_dano === "D20" || tipo_dano?.toLowerCase().includes("grieta") || tipo_dano?.toLowerCase().includes("fisura")) {
    color = "#a3f7ff"; // Celeste pastel muy claro
    nombre = "Grieta / Fisura";
  } else if (tipo_dano === "calle_tierra" || tipo_dano?.toLowerCase().includes("tierra")) {
    color = "#2266ff"; // Azul profundo
    nombre = "Calle de Tierra";
  }

  // Tamaño parejo y pequeño (14px) para evitar superposición
  const size = 14;

  const icono = new L.DivIcon({
    className: "",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 1.5px solid #000;
      border-radius: 50%;
      box-shadow: 0 0 6px ${color}aa;
      cursor: pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return { icono, color, nombre };
};

export default function MapaVial({ detecciones, trayectorias = {}, onSeleccionarVideo, onSeleccionarFalla, filtrosClases, setFiltrosClases }: any) {
  const [limitesMoreno, setLimitesMoreno] = useState<any>(null);
  const [leyendaExpandida, setLeyendaExpandida] = useState(true);

  useEffect(() => {
    const obtenerLimites = async () => {
      try {
        const res = await fetch("https://nominatim.openstreetmap.org/search.php?q=Partido+de+Moreno,+Buenos+Aires,+Argentina&polygon_geojson=1&format=json");
        const data = await res.json();

        if (data && data.length > 0) {
          setLimitesMoreno(data[0].geojson);
        }
      } catch (error) {
        console.error("Error al cargar los límites de Moreno:", error);
      }
    };

    obtenerLimites();
  }, []);

  return (
    <MapContainer
      center={[-34.6441, -58.7894]}
      zoom={12}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-map-tiles"
      />

      {limitesMoreno && (
        <GeoJSON
          data={limitesMoreno}
          style={{
            color: '#00aaff',
            weight: 3,
            opacity: 0.9,
            fillColor: '#00aaff',
            fillOpacity: 0.05,
            dashArray: '5, 10'
          }}
        />
      )}

      {detecciones.map((d: any) => {
        if (!d.geometria || !d.geometria.coordinates) return null;
        const lon = d.geometria.coordinates[0];
        const lat = d.geometria.coordinates[1];

        const { icono, color, nombre } = obtenerEstilosFalla(d.tipo_dano);

        return (
          <Marker
            key={d.id}
            position={[lat, lon]}
            icon={icono}
            eventHandlers={{
              click: () => {
                onSeleccionarVideo(d.video_id);
                if (onSeleccionarFalla) onSeleccionarFalla(d);
              }
            }}
          >
            <Popup>
              <div className="text-gray-200 text-sm">
                <strong style={{ color: color }}>
                  <i className="fa-solid fa-road-circle-exclamation mr-1.5"></i> 
                  {nombre}
                </strong>
                <div className="mt-1.5 text-xs text-gray-400">
                  Confianza: <span className="font-bold text-gray-200">{(d.confianza * 100).toFixed(0)}%</span><br/>
                  Video: <span className="font-bold text-gray-200">#{d.video_id}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {Object.keys(trayectorias).map((vidId) => {
        const puntosDeRuta = trayectorias[vidId] as any[];
        if (puntosDeRuta && puntosDeRuta.length > 1) {
          return (
            <Polyline
              key={`trayecto-${vidId}`}
              positions={puntosDeRuta}
              pathOptions={{
                color: '#33ccff',
                weight: 2,
                opacity: 0.8,
                dashArray: '10, 10',
                lineJoin: 'round'
              }}
            />
          );
        }
        return null;
      })}

      {/* LEYENDA DEL MAPA - Paleta Coherente Celeste/Azul - INTERACTIVA Y MINIMIZABLE */}
      <div style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        backgroundColor: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(4px)",
        border: "1px solid #222",
        borderRadius: "8px",
        padding: "8px 12px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
        color: "#e0e0e0",
        fontSize: "11px",
        transition: "all 0.2s ease-in-out",
        minWidth: "110px"
      }}>
        <div 
          onClick={() => setLeyendaExpandida(!leyendaExpandida)}
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            cursor: "pointer",
            borderBottom: leyendaExpandida ? "1px solid #333" : "none", 
            paddingBottom: leyendaExpandida ? "4px" : "0", 
            marginBottom: leyendaExpandida ? "2px" : "0", 
            gap: "12px" 
          }}
          title={leyendaExpandida ? "Minimizar leyenda" : "Expandir leyenda"}
        >
          <strong style={{ color: "#00aaff", fontWeight: "bold" }}>
            <i className="fa-solid fa-layer-group mr-1"></i> Leyendas
          </strong>
          <i className={`fa-solid ${leyendaExpandida ? 'fa-chevron-down' : 'fa-chevron-up'} text-gray-500`} style={{ fontSize: "9px" }}></i>
        </div>

        {leyendaExpandida && (
          <>
            {/* Bache */}
            <div 
              onClick={() => setFiltrosClases((prev: any) => ({ ...prev, "D40": !prev["D40"] }))}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                cursor: "pointer",
                opacity: filtrosClases?.["D40"] !== false ? 1 : 0.35,
                transition: "opacity 0.2s"
              }}
              title="Alternar Baches"
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#00b8ff", border: "1.5px solid #000", boxShadow: "0 0 4px #00b8ffaa" }}></div>
              <span style={{ textDecoration: filtrosClases?.["D40"] !== false ? "none" : "line-through" }}>Bache (D40)</span>
            </div>

            {/* Grieta */}
            <div 
              onClick={() => setFiltrosClases((prev: any) => ({ ...prev, "D20": !prev["D20"] }))}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                cursor: "pointer",
                opacity: filtrosClases?.["D20"] !== false ? 1 : 0.35,
                transition: "opacity 0.2s"
              }}
              title="Alternar Grietas / Fisuras"
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#a3f7ff", border: "1.5px solid #000", boxShadow: "0 0 4px #a3f7ffaa" }}></div>
              <span style={{ textDecoration: filtrosClases?.["D20"] !== false ? "none" : "line-through" }}>Grieta / Fisura (D20)</span>
            </div>

            {/* Calle de Tierra */}
            <div 
              onClick={() => setFiltrosClases((prev: any) => ({ ...prev, "calle_tierra": !prev["calle_tierra"] }))}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                cursor: "pointer",
                opacity: filtrosClases?.["calle_tierra"] !== false ? 1 : 0.35,
                transition: "opacity 0.2s"
              }}
              title="Alternar Calles de Tierra"
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2266ff", border: "1.5px solid #000", boxShadow: "0 0 4px #2266ffaa" }}></div>
              <span style={{ textDecoration: filtrosClases?.["calle_tierra"] !== false ? "none" : "line-through" }}>Calle de Tierra</span>
            </div>

            {/* Botón de activar todos al final del recuadro */}
            <div style={{ borderTop: "1px solid #333", paddingTop: "4px", marginTop: "2px" }}>
              <span 
                onClick={(e) => {
                  e.stopPropagation(); // Evita que se minimice al hacer clic en "Todos"
                  setFiltrosClases({ "D40": true, "D20": true, "calle_tierra": true });
                }}
                style={{
                  fontSize: "9px",
                  color: "#00aaff",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: "bold"
                }}
                title="Activar todos"
              >
                Activar todos
              </span>
            </div>
          </>
        )}
      </div>

    </MapContainer>
  );
}
