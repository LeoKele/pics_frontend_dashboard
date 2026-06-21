# PICS Moreno — Dashboard Frontend

Este repositorio contiene la aplicación web del **Panel de Control PICS**, desarrollada como parte del Proyecto Integrador de Ciencias de Datos en la Universidad Nacional de Luján.

El frontend consume la [API REST del sistema PICS](https://github.com/LeoKele/pics_arquitectura/tree/main) y provee una interfaz visual para que el municipio monitoree el estado de la red vial en tiempo real.

---

## Descripción General

El dashboard permite:

- **Visualizar en un mapa interactivo** (Leaflet.js + OpenStreetMap) todas las fallas viales detectadas sobre el Partido de Moreno, con sus trayectorias GPS superpuestas.
  - **Unificación Estética y Leyenda Interactiva:** Marcadores en colores de celeste/azul según tipo de daño (`D40` Bache en celeste brillante, `D20` Grieta en celeste pastel, `calle_tierra` Calle de tierra en azul profundo). La leyenda permite alternar (filtrar) las detecciones en el mapa con un clic.
  - **Filtro de Umbral de Confianza:** Slider interactivo para ocultar detecciones que no superen una certeza mínima de predicción (ej. 30%).

- **Auditar detecciones** marcándolas como verificadas o falsos positivos directamente desde la tarjeta **DETECCIONES**. Los falsos positivos se envían a un bucket de backgrounds en MinIO para el reentrenamiento MLOps.

- **Consultar, generar y gestionar reportes de IA** en tiempo real utilizando LLMs configurables (Gemini, OpenAI u Ollama local).
  - **Resumen Rápido:** Tarjetas informativas con conteo rápido y nivel de urgencia.
  - **Historial y Borrado:** Panel lateral para revisar reportes anteriores o eliminarlos (con alerta interactiva SweetAlert).
  - **Cálculo de Tramos:** Identifica de forma descriptiva el inicio y fin de la calle recorrida (ej. "Calle A hasta Calle B").

- **Chatear con PozoBot** en tiempo real con soporte de streaming de respuesta y renderizado dinámico del chat.

- **Visualizar Métricas Municipales:** Modal interactivo con gráficos de tendencia semestral y estadísticas de efectividad del modelo.

- **Monitorear el estado de la infraestructura** desde una página de status dedicada `/status` (habilitada tanto para administrador como para operador).

- **Ver Logs de la API:** Acceso directo para administradores a la consola de Grafana Loki para inspeccionar logs del servicio `api_fastapi`.

---

## Estructura del Repositorio

```
frontend-pics/
├── app/
│   ├── layout.tsx          # Layout raíz
│   ├── page.tsx            # Punto de entrada
│   ├── globals.css         # Estilos globales y clases
│   └── status/
│       └── page.tsx        # Página de health status
└── components/
    ├── Dashboard.tsx       # Layout principal
    ├── MapaVial.tsx        # Mapa Leaflet con detecciones, trayectorias y límites de Moreno
    ├── FotoDeteccion.tsx   # Foto del frame con bounding box y botones de auditoría
    ├── ChatIA.tsx          # Chat con PozoBot
    ├── ModalReporte.tsx    # Modal de reporte
    └── Login.tsx           # Pantalla de autenticación
```

---

## Cómo levantar el proyecto

### Desarrollo local

```bash
npm install
npm run dev
```

El dashboard estará disponible en `http://localhost:3000` (o el siguiente puerto libre).

> Requiere que el [backend PICS](https://github.com/LeoKele/pics_arquitectura/tree/main) esté corriendo. Con `docker-compose up` en el repo del backend.
>
> **Credenciales de Acceso por Defecto (BD Seeded):**
> Al iniciar el backend, se crean automáticamente dos usuarios para pruebas locales:
> *   **Administrador:** Usuario `admin` | Contraseña `admin`
> *   **Operador:** Usuario `operador` | Contraseña `operador`

### Build de producción (Docker)

```bash
docker compose up
```

### Deploy en Netlify

La aplicación cliente de la Pozocam se encuentra desplegada y accesible públicamente a través de Netlify en el siguiente enlace:

URL de Producción: https://pics-dashboard.netlify.app/

El despliegue está configurado para conectarse de forma transparente con nuestra infraestructura en Google Cloud, resolviendo los problemas nativos de seguridad del navegador (bloqueos por Mixed Content al mezclar https:// con http://) mediante un sistema de proxy interno.

Para asegurar la comunicación entre el frontend seguro en Netlify y nuestro backend (FastAPI) y servidor de almacenamiento (MinIO), utilizamos el motor de redirecciones nativo de Netlify. `(_redirects)` en la carpeta /public.

---
