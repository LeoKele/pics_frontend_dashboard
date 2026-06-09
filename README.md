# PICS Moreno — Dashboard Frontend

Este repositorio contiene la aplicación web del **Panel de Control PICS** (Plataforma de Inspección y Control del Estado de Superficies), desarrollada como parte del Proyecto Integrador de Ciencias de Datos en la Universidad Nacional de Luján, en colaboración con la Secretaría de Obras Públicas del Municipio de Moreno.

El frontend consume la [API REST del sistema PICS](https://github.com/tu-org/pics-backend) *(repo backend)* y provee una interfaz visual para que el municipio monitoree el estado de la red vial en tiempo real.

---

## Descripción General

El dashboard permite:

- **Visualizar en un mapa interactivo** (Leaflet.js + OpenStreetMap) todas las fallas viales detectadas sobre el Partido de Moreno, con sus trayectorias GPS superpuestas.
- **Auditar detecciones** marcándolas como verificadas o falsos positivos directamente desde la interfaz.
- **Consultar y generar reportes de IA** por video procesado, con streaming en tiempo real desde Ollama.
- **Chatear con PozoBot**, el asistente de inteligencia vial que responde preguntas sobre detecciones a nivel municipal o por video específico.
- **Monitorear el estado de la infraestructura** desde una página de status dedicada con uptime visual por servicio.

---

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Next.js 14 (App Router)** | Framework React con soporte SSR/SSG |
| **TypeScript** | Tipado estático |
| **Tailwind CSS** | Estilos utilitarios |
| **Leaflet.js / react-leaflet** | Mapa interactivo con marcadores y polilíneas |
| **marked** | Renderizado de Markdown para reportes y chat |
| **SweetAlert2** | Modales de confirmación para auditoría |
| **Font Awesome 6** | Iconografía |

---

## Estructura del Repositorio

```
frontend-pics/
├── app/
│   ├── layout.tsx          # Layout raíz: metadatos, fuentes, estilos globales
│   ├── page.tsx            # Punto de entrada: Login → Dashboard
│   ├── globals.css         # Estilos globales y clases custom (mapa oscuro, scrollbar)
│   └── status/
│       └── page.tsx        # Página de estado de la infraestructura (/status)
└── components/
    ├── Dashboard.tsx       # Layout principal: sidebar, mapa, chat, foto, KEDA
    ├── MapaVial.tsx        # Mapa Leaflet con detecciones, trayectorias y límites de Moreno
    ├── FotoDeteccion.tsx   # Foto del frame con bounding box y botones de auditoría
    ├── ChatIA.tsx          # Chat con PozoBot (asistente de IA vial)
    ├── ModalReporte.tsx    # Modal de reporte: GET (guardado) o POST (streaming con IA)
    └── Login.tsx           # Pantalla de autenticación
```

---

## Variables de Entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MINIO_URL=http://localhost:9000
NEXT_PUBLIC_GRAFANA_URL=http://localhost:3000
```

> **Para el despliegue en GCP:** estas variables se inyectan en tiempo de build mediante `--build-arg` en Docker. El workflow de GitHub Actions lo realiza automáticamente en cada push a `main` con las IPs públicas de producción.

---

## Cómo levantar el proyecto

### Desarrollo local

```bash
npm install
npm run dev
```

El dashboard estará disponible en `http://localhost:8080` (o el siguiente puerto libre).

> Requiere que el [backend PICS](https://github.com/tu-org/pics-backend) esté corriendo. Con `docker-compose up --build -d` en el repo del backend se levanta todo el stack incluyendo este frontend.

### Build de producción (Docker)

```bash
docker compose up
```

---

## Funcionalidades por Componente

### `Dashboard.tsx`
Componente raíz que orquesta el layout completo. Realiza polling cada 15 segundos a `/api/v1/detecciones`, `/api/v1/trayectorias` y `/api/v1/health`. Gestiona el estado global: video seleccionado, falla seleccionada, modal de reporte, y la lista de videos procesados.

El layout es una grilla CSS de 3×3 columnas:
- **Columna izquierda**: Sidebar con estadísticas, historial de videos y botones de reporte.
- **Centro (2/3 del ancho, 2/3 del alto)**: Mapa interactivo.
- **Derecha (1/3 del ancho, 2/3 del alto)**: Panel de inspección técnica (foto + auditoría).
- **Inferior centro**: Estado del sistema KEDA (cola de procesamiento).
- **Inferior derecha**: Chat con PozoBot.

### `MapaVial.tsx`
Mapa Leaflet cargado dinámicamente (sin SSR) con:
- Tiles de OpenStreetMap con filtro CSS oscuro (`dark-map-tiles`).
- Polígono GeoJSON del Partido de Moreno obtenido desde Nominatim al montar.
- Marcadores circulares azules para cada detección con popup de confianza.
- Polilíneas punteadas para las trayectorias GPS por video.

### `FotoDeteccion.tsx`
Muestra el frame capturado en MinIO con la bounding box dibujada como overlay CSS. Incluye:
- **Efecto lupa**: zoom 2.2× hacia el puntero del mouse con `transform-origin` dinámico.
- Geocodificación inversa del punto GPS via Nominatim para mostrar el nombre de la calle.
- Botones de auditoría (**Verificar** / **Falso Positivo**) que hacen `PATCH /api/v1/detecciones/{id}` con confirmación SweetAlert2.

### `ModalReporte.tsx`
Modal con dos modos de operación controlados por la prop `metodo`:
- **GET**: Busca un reporte ya generado en `GET /api/v1/reporte/{video_id}`.
- **POST**: Genera uno nuevo en tiempo real vía `POST /api/v1/reportes/generar` con **streaming** de la respuesta de Ollama, renderizando el Markdown incrementalmente con barra de progreso animada.

### `ChatIA.tsx`
Chat simple con PozoBot. Envía preguntas a `POST /api/v1/video/{video_id}/preguntar`. Si no hay video seleccionado, usa `video_id=0` para consultas de alcance municipal. Las respuestas se renderizan en Markdown.

### `Login.tsx`
Pantalla de autenticación que llama a `POST /api/v1/login`. Guarda el `access_token` y el `rol` (`admin` u `operador`) en `localStorage`. El rol controla la visibilidad de los botones de Ver Logs y el estado del sistema en el header.

### `app/status/page.tsx`
Página independiente en `/status` que consulta `GET /api/v1/health` cada 15 segundos y muestra el estado (`VERDE` / `AMARILLO` / `ROJO`) de cada servicio (FastAPI, PostgreSQL, Redis, MinIO, Ollama) con barras de uptime históricas simuladas.

---

## Notas de Desarrollo

- **Leaflet requiere `dynamic import` con `{ ssr: false }`** para evitar errores de hidratación en Next.js, ya que accede a `window` directamente.
- Las imágenes de detección se sirven desde MinIO. Los espacios en los nombres de archivo se reemplazan por guiones bajos (`frame_minio_path.replace(/ /g, "_")`) para generar URLs válidas.
- Las bounding boxes pueden venir en coordenadas absolutas (píxeles) o normalizadas (0–1). `FotoDeteccion.tsx` detecta automáticamente el formato comparando si `x2 <= 2 && y2 <= 2`.

---
