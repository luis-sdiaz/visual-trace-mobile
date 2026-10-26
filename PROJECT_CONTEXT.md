# PROJECT CONTEXT — VisualTrace Mobile

## 1. Resumen del Proyecto

**VisualTrace** es una aplicación móvil multiplataforma orientada a la documentación y comparación visual rigurosa del estado de espacios u objetos mediante pares fotográficos temporales ("ANTES" / `initial` y "DESPUÉS" / `final`). Su funcionalidad core radica en la captura y persistencia segura de evidencia visual en almacenamiento privado en la nube (aislado por usuario), combinada con un motor de análisis comparativo asistido por IA (Google Gemini) que identifica, categoriza y resume discrepancias físicas bajo un esquema estructurado estricto y de carácter consultivo.

---

## 2. Tech Stack

### Entorno Móvil & Runtime
- **Framework Principal:** [React Native](https://reactnative.dev/) `0.86.3` sobre [Expo SDK 57](https://expo.dev/) (`expo ~57.0.30`).
- **Arquitectura React:** [React 19](https://react.dev/) `19.2.3` con soporte para React Compiler activado (`reactCompiler: true`).
- **Enrutamiento y Navegación:** [Expo Router](https://docs.expo.dev/router/introduction/) `~57.0.28` (enrutamiento declarativo basado en sistema de archivos con `typedRoutes` habilitado).
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) `~6.0.3` con verificación estricta (`strict: true`) y resolución de rutas modularizada (`@/*`).

### UI, Gestos y Animaciones
- **Sistema de Diseño:** Componentes nativos estilizados mediante `StyleSheet` modular desacoplado en Design Tokens (`Colors`, `Spacing`, `Radius`, `Typography`).
- **Motor de Animaciones:** `react-native-reanimated` `4.5.1` y `react-native-worklets` `0.10.1`.
- **Manejo de Gestos e Interacciones:** `react-native-gesture-handler` `~2.32.0`.
- **Áreas Seguras y Pantallas Nativas:** `react-native-safe-area-context` `~5.7.0` y `react-native-screens` `~4.26.0`.
- **Iconografía e Interfaz:** `@expo/vector-icons` `^15.0.2` (Ionicons), `@expo/ui` `~57.0.25`, `expo-symbols` `~57.0.3`.

### Captura y Manejo Multimedia
- **Selector de Fotos y Cámara:** `expo-image-picker` `~57.0.20` (soporte para cámara, galería, validación de permisos en caliente y control de compresión).
- **Sistema de Archivos:** `expo-file-system` `~57.0.7`.

### Backend, Persistencia & Servicios en la Nube
- **Plataforma BaaS:** [Supabase](https://supabase.com/) (`@supabase/supabase-js` `^2.48.0` / ESM CDN en Deno).
  - **Supabase Auth:** Autenticación por correo y contraseña, control de sesión persistente y revocación.
  - **Base de Datos (PostgreSQL 15+):** Tablas relacionales con Row Level Security (RLS) mandatorio, políticas multi-tenant y procedimientos almacenados transaccionales (`security definer`).
  - **Supabase Storage:** Bucket privado `comparison-images` protegido por políticas RLS jerárquicas e idempotentes, límite individual sincronizado a 10 MiB (10,485,760 bytes), límite de par a 20 MiB (20,971,520 bytes) y acceso mediante URLs prefirmadas de tiempo limitado.
  - **Edge Functions (Deno Runtime):** Función `analyze-comparison` desplegada activamente en producción (versión 29, `status: ACTIVE`) con verificación JWT (`verify_jwt = true`), descarga y validación binaria de imágenes en memoria, deduplicación de ejecuciones y control estricto de cuotas transaccionales.

### Inteligencia Artificial
- **Motor de Inferencia:** Google Gemini REST API v1beta / v1 (modelo activo validado: `gemini-3.5-flash`), ejecutado de forma privada desde Supabase Edge Functions con secreto `GEMINI_API_KEY` aprovisionado en la nube.
- **Sincronización de Entorno:** Secreto remoto `GEMINI_MODEL=gemini-3.5-flash` activo en Supabase Secrets.
- **Contrato de Integración:** Especificación `1.0` con salida estructurada mandatoria mediante JSON Schema (`GEMINI_ANALYSIS_RESPONSE_SCHEMA`). La invocación se realiza exclusivamente desde el backend protegido; nunca se expone la API Key ni se procesa directamente en el cliente.

### Persistencia Local
- **Motor de Caché y Borradores:** `@react-native-async-storage/async-storage` `2.2.0` (persistencia del token de sesión Supabase y cola transaccional para borradores locales aislados por identificador de usuario).

### Calidad, Análisis Estático & Testing
- **Test Runner:** [Vitest](https://vitest.dev/) `5.0.4` (208 pruebas unitarias y de integración que validan contratos, utilidades, servicios y Edge Functions al 100%).
- **Linter:** [ESLint](https://eslint.org/) `^9.39.5` con configuración `eslint-config-expo`.
- **Verificación de Tipos:** `typescript` con validación estricta sin emisiones (`npx tsc --noEmit`).

---

## 3. Arquitectura y Manejo de Estado

### Patrones de Diseño Arquitectónico

```text
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                   │
│        Expo Router Pages (src/app) + UI Components     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    APPLICATION STATE                   │
│         AuthContext.tsx  │  ComparisonContext.tsx      │
└─────────────┬─────────────────────────────┬────────────┘
              │                             │
┌─────────────▼──────────────┐ ┌────────────▼────────────┐
│       SERVICE LAYER        │ │     INFRASTRUCTURE      │
│  - authService.ts          │ │  - comparisonStorage.ts │
│  - comparisonService.ts    │ │    (AsyncStorage Cache) │
│  - imageStorageService.ts  │ │  - supabase.ts          │
│  - analysisWorkflow.ts     │ │    (Supabase Client)    │
│  - lifecycleService.ts     │ └─────────────────────────┘
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│             SHARED CONTRACTS (SSOT)                    │
│   src/contracts/  <=======>  supabase/functions/_shared│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   BACKEND PLATFORM                     │
│   PostgreSQL (RLS) + Storage Bucket + Edge Functions   │
└────────────────────────────────────────────────────────┘
```

1. **Separación de Responsabilidades en Capas (Layered / Clean Architecture):**
   - **Presentation:** Pantallas reactivas en `src/app/` y componentes desacoplados en `src/components/`. Las pantallas delegan la lógica de negocio a los servicios y consumen únicamente interfaces y hooks.
   - **Domain / Shared Contracts:** Ubicados en `src/contracts/` e indexados en espejo con `supabase/functions/_shared/`. Actúan como Single Source of Truth (SSOT) para contratos de carga útil (payloads), tipos de diferencias (`added`, `removed`, `modified`, `moved`, `appearance`, `other`) y esquemas de respuesta.
   - **Service Layer & Orchestration:** Funciones puras y servicios asíncronos especializados en `src/services/` (`authService`, `comparisonService`, `comparisonImageLifecycleService`, `analysisWorkflow`). Encapsulan las operaciones de red, manejo de excepciones de dominio y reintentos.
   - **Infrastructure / Storage:** Abstracciones para AsyncStorage y el cliente singleton de Supabase.

2. **Control de Concurrencia y Resiliencia:**
   - **Single-Flight Pattern (`singleFlight.ts`):** Deduplica promesas en vuelo para evitar condiciones de carrera al solicitar URLs firmadas o ejecutar análisis de IA.
   - **Optimistic Concurrency & Naming Versioning:** Gestión atómica de reemplazo de imágenes en Supabase Storage mediante prefijos de versionado (`stage-TIMESTAMP.ext`), garantizando que lecturas concurrentes nunca observen un estado inconsistente.
   - **Defensive Quota Reservation:** Sistema transaccional en PostgreSQL (`ai_usage_limits` y RPCs) que reserva la cuota previa a la llamada al LLM y maneja fallos inciertos de manera conservadora con rollback de reservas.

---

## 4. Estructura de Directorios

```text
VisualTrace/
├── assets/                     # Recursos gráficos estáticos (iconos, splash screen, fuentes)
├── src/                        # Código fuente de la aplicación móvil
│   ├── app/                    # Rutas y pantallas de la aplicación (Expo Router)
│   │   ├── _layout.tsx         # Layout raíz, inyección de Providers y guards de navegación
│   │   ├── index.tsx           # Punto de entrada / redirección según sesión
│   │   ├── login.tsx           # Pantalla de inicio de sesión
│   │   ├── register.tsx        # Pantalla de registro de usuarios
│   │   ├── home.tsx            # Dashboard: listado paginado, búsqueda y filtros de comparaciones
│   │   ├── new-comparison.tsx  # Paso 1 del flujo: definición de nombre de comparación
│   │   ├── initial-state.tsx   # Paso 2 del flujo: captura y carga de foto 'ANTES'
│   │   ├── final-state.tsx     # Paso 3 del flujo: captura y carga de foto 'DESPUÉS'
│   │   └── comparison-result.tsx # Visor de comparación, ejecución de IA e informe de resultados
│   ├── components/             # Componentes de presentación reutilizables
│   │   ├── auth/               # Subcomponentes de autenticación (ej. reenvío de confirmación)
│   │   └── ui/                 # Componentes genéricos de UI (Button, Modales de previsualización)
│   ├── constants/              # Design tokens del sistema visual (colores, tipografía, espacios, radios)
│   ├── context/                # Proveedores de estado global (AuthContext, ComparisonContext)
│   ├── contracts/              # Definiciones de tipo y contratos compartidos (SSOT con backend)
│   ├── integration/            # Pruebas automatizadas de integración de workflows completos
│   ├── lib/                    # Clientes y configuraciones de bajo nivel (instancia singleton de Supabase)
│   ├── services/               # Capa de lógica de negocio y comunicación con Supabase
│   │   ├── analysisService.ts  # Cliente de invocación y consulta para Edge Functions de IA
│   │   ├── analysisWorkflow.ts # Máquina de estados UI para el ciclo de vida del análisis
│   │   ├── authService.ts      # Operaciones de autenticación de usuario
│   │   ├── authSessionService.ts # Observadores reactivos del estado de la sesión
│   │   ├── comparisonImageLifecycleService.ts # Gestión de ciclo de vida y versionado de imágenes
│   │   ├── comparisonImagePath.ts # Generación y validación de paths canónicos en Storage
│   │   ├── comparisonRecoveryService.ts # Conciliación y recuperación entre borrador local y remoto
│   │   └── comparisonService.ts# CRUD y paginación cursor-based de comparaciones en PostgreSQL
│   ├── storage/                # Almacenamiento local persistente (AsyncStorage para drafts)
│   └── utils/                  # Utilidades y funciones puras (validaciones, selecciones de imagen, singleFlight)
├── supabase/                   # Configuración e infraestructura de Backend
│   ├── config.toml             # Configuración del CLI y entorno local de Supabase
│   ├── functions/              # Supabase Edge Functions (Deno)
│   │   ├── _shared/            # Módulos y esquemas compartidos entre cliente y funciones
│   │   └── analyze-comparison/ # Edge function para inferencia de Gemini y control de cuota
│   ├── migrations/             # Migraciones SQL versionadas (tablas, RLS, procedimientos PL/pgSQL)
│   └── tests/                  # Pruebas de integración sobre PostgreSQL y Storage RLS
├── .env.local                  # Variables de entorno públicas del cliente (no versionado)
├── app.json                    # Manifiesto de configuración de Expo
├── eslint.config.js            # Configuración de ESLint 9
├── package.json                # Dependencias del proyecto y scripts de ejecución
├── tsconfig.json               # Configuración del compilador TypeScript con path mapping
└── vitest.config.mts           # Configuración del motor de pruebas Vitest
```

---

## 5. Resumen Ejecutivo de los Logros Técnicos de la Fase 1 (Cierre Oficial)

La **Fase 1** concluyó con éxito rotundo, alcanzando la estabilización técnica integral de la arquitectura backend, la integración de IA y la validación end-to-end:

### 1. Estabilización Completa de Supabase Edge Functions (`analyze-comparison`)
- **Blindaje del Ciclo de Vida Deno:** Se implementó un envoltorio global `try/catch` ultra-robusto alrededor del ciclo de vida de `Deno.serve`, handlers de `unhandledrejection` / `error`, e inicialización diferida (`lazy init`) con validación previa de variables de entorno.
- **Manejo Integral de CORS:** Preflight `OPTIONS` interceptado de forma inmediata e incondicional con cabeceras CORS homogéneas en respuestas de éxito y de error HTTP (500, 502, 503).
- **Prevención de Fugas y Control de Memoria:** Descarga y lectura de imágenes binarias optimizada en memoria sin copias redundantes de buffers o strings en Base64, evitando colapsos del worker por límites de RAM (256 MB) o cierres abruptos (evitando códigos 502/503 silenciosos).
- **Sanitización de Modelos y Compatibilidad de URLs:** Sanitización determinista de identificadores de modelo eliminando prefijos redundantes (`rawModel.replace(/^models\//, "")`) para prevenir rutas inválidas (`models/models/...`) en la API de Google.
- **Propagación Transparente de Errores:** Captura y extracción del mensaje detallado devuelto por la API de Google Generative Language (`error.message`), facilitando diagnósticos inmediatos sin enmascaramiento genérico.
- **Valores por Defecto Seguros en Cuotas:** Refactorización de `usageLimits.ts` para aplicar valores por defecto seguros ante variables de entorno no configuradas, impidiendo caídas críticas del runtime.

### 2. Integración y Validación en Vivo de `gemini-3.5-flash`
- **Inspección de Modelos Activos en Google ModelService:** Mediante consulta directa al endpoint de modelos con la credencial de producción, se mapeó el catálogo activo, descartando modelos deprecados (`gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-flash`) y adoptando el modelo oficial activo **`gemini-3.5-flash`**.
- **Inferencia en Caliente Exitosa:** Validación en vivo en producción ejecutando inferencia visual comparativa multimodal con dos imágenes binarias, generando reportes estructurados bajo el contrato estricto `1.0` en español en un tiempo de respuesta de ~5 segundos.
- **Soporte de Esquema Estructurado JSON:** Extracción robusta de texto en `geminiClient.ts` compatible con partes de razonamiento (`thoughtSignature`), validando completamente `hasVisibleChanges`, `summary`, `differences`, `observations` y `uncertainties`.

### 3. Infraestructura de Base de Datos y Procedimientos Almacenados (RPCs)
- **Migración Consolidada:** Aplicación exitosa de la migración `202610250001_ensure_ai_analysis_rpcs_and_tables.sql` en la base de datos remota de Supabase.
- **Tablas y Seguridad:** Creación y verificación de `public.ai_analysis_reports` y `public.ai_analysis_attempts`, configuradas con Row Level Security (RLS) e índices de búsqueda eficientes.
- **Procedimientos Transaccionales Seguros (`security definer`):**
  * `reserve_ai_analysis_usage`: Control transaccional de cuota con bloqueo (`FOR UPDATE`) verificando ventanas por minuto, por día, por usuario y por comparación, con soporte para reuso de reportes preexistentes (`cached`).
  * `persist_ai_analysis_report`: Inserción idempotente de reportes con actualización de estado en la comparación y registro del intento exitoso.
  * `complete_ai_analysis_usage`: Conciliación atómica del resultado del intento (éxito o fallo).
- **Sincronización de Secretos Remotos:** Registro y actualización exitosa de secretos en Supabase Secrets: `GEMINI_API_KEY` aprovisionada y `GEMINI_MODEL=gemini-3.5-flash` sincronizada.

### 4. Calidad, Pruebas y Validación E2E
- **Suite Vitest al 100%:** 208 pruebas automatizadas ejecutadas y superadas en su totalidad (`21/21` suites de pruebas en verde).
- **Tipado TypeScript Estricto:** Compilación limpia sin emisiones (`npx tsc --noEmit`) con código de salida 0.
- **Prueba E2E Validada:** Flujo completo verificado desde la interfaz cliente móvil (captura de fotos, sincronización en Storage, reserva de cuota, inferencia y persistencia del reporte).

---

## 6. Estado Actual y Contexto para la Fase 2

### Fase en Curso: Fase 2 — Experiencia de Usuario, Feedback Visual y Gestión de Cuotas

Habiendo alcanzado la estabilidad total del motor de backend y del proveedor de IA, el foco del desarrollo se traslada a la capa de presentación y experiencia de usuario (UX/UI).

### Bloque D: Feedback Visual Durante el Análisis de IA y Manejo Intuitivo de Cuotas en la UI
1. **Feedback Visual Durante la Carga de Análisis:**
   - Implementación de loaders contextuales, skeletons animados e indicadores de progreso/fase (e.g., "Preparando imágenes...", "Analizando diferencias...", "Generando informe...") durante la ventana de espera de la inferencia (3 a 7 segundos).
   - Prevención activa de interacciones accidentales o reenvíos mientras el análisis está en vuelo.

2. **Manejo Intuitivo de Cuotas Agotadas en la UI:**
   - Presentación de estados `limited` amigables y educativos cuando se alcanzan límites por minuto o por día (diferenciando cuota de usuario vs cuota por comparación específica).
   - Indicadores de tiempo de espera o conteo regresivo para el restablecimiento de cuota por minuto.
   - Enlaces de acción claros (e.g., "Reintentar más tarde", "Ver comparaciones anteriores").

3. **Manejo de Estados de Error y Resiliencia en Cliente:**
   - Banners informativos no invasivos ante fallos transitorios de red o tiempo de espera excedido (`timeout`).
   - Mecanismos de reintento manual que preserven el estado de las fotografías cargadas sin reiniciar el flujo wizard.
