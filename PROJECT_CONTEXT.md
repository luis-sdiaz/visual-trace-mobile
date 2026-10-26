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
- **Test Runner:** [Vitest](https://vitest.dev/) `5.0.4` (250 pruebas unitarias y de integración en 26 suites que validan componentes UI, contratos, utilidades, servicios y Edge Functions al 100%).
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
   - Implementación de loaders contextuales, skeletons animados e indicadores de progreso/fase (e.g., "Preparando imágenes...", "Conectando con Supabase...", "Invocando Gemini AI...", "Estructurando reporte...") durante la ventana de espera de la inferencia (3 a 7 segundos).
   - Prevención activa de interacciones accidentales o reenvíos mientras el análisis está en vuelo.

2. **Manejo Intuitivo de Cuotas Agotadas en la UI:**
   - Presentación de estados `limited` amigables y educativos cuando se alcanzan límites por minuto o por día (diferenciando cuota de usuario vs cuota por comparación específica).
   - Indicadores de tiempo de espera o conteo regresivo para el restablecimiento de cuota por minuto.
   - Enlaces de acción claros (e.g., "Reintentar más tarde", "Ver comparaciones anteriores").

3. **Manejo de Estados de Error y Resiliencia en Cliente:**
   - Banners informativos no invasivos ante fallos transitorios de red o tiempo de espera excedido (`timeout`).
   - Mecanismos de reintento manual que preserven el estado de las fotografías cargadas sin reiniciar el flujo wizard.

---

## 7. Registro de Commits de la Fase 2

### Commit 96 — Inicio del Bloque D: Componente Esqueleto de Carga Animada de IA
- **Componente Creado:** `src/components/ui/AiAnalysisLoadingSkeleton.tsx`
  - Diseño desacoplado siguiendo arquitectura limpia: función pura de programación temporal (`createAiLoadingScheduler`), hook reactivo (`useAiLoadingStages`) y componente de presentación (`AiAnalysisLoadingSkeleton`).
  - Utiliza Design Tokens estrictos (`Colors`, `Typography`, `Spacing`, `Radius`).
  - Rotación dinámica e intuitiva de etapas de análisis ("Preparando imágenes...", "Conectando con Supabase...", "Invocando Gemini AI...", "Estructurando reporte...").
  - Indicadores visuales de paso/fase (pills de progreso dinámicos), spinner nativo `ActivityIndicator`, insignias contextuales y placeholder bars que emulan el informe final.
- **Suite de Pruebas Unitaria:** `src/components/ui/AiAnalysisLoadingSkeleton.test.tsx`
  - 9 pruebas unitarias que validan el renderizado estático inicial, props controladas, valores fuera de rango seguros y transiciones de estado mediante temporizadores simulados (`vi.useFakeTimers()`).
- **Configuración de Testing:** Soporte para resolución en entorno de pruebas Vitest aliando `react-native` hacia `react-native-web` en `vitest.config.mts`.

### Commit 97 — Integración de Modal Bloqueante con Skeleton de Carga en Comparison Result
- **Integración de Componente:** `src/app/comparison-result.tsx`
  - Inserción de `Modal` bloqueante con `AiAnalysisLoadingSkeleton` desplegado mientras `isAnalyzing === true` (análisis en vuelo hacia Edge Function `analyze-comparison` y Gemini Flash).
  - Bloqueo activo de interacciones accidentales de pantalla: interceptación de eventos táctiles mediante overlay (`rgba(15, 23, 42, 0.65)`), bloqueo del botón de retroceso por hardware (`hardwareBackPress` y `onRequestClose`), deshabilitación de botones de navegación, edición de nombre y acción de análisis.
  - Ajuste de feedback visual: el loader síncrono previo se reserva exclusivamente para la consulta inicial rápida de base de datos (`loading_report`), mientras que la inferencia de IA despliega el overlay con rotación contextual de 4 fases y barras de progreso.
- **Optimización Arquitectónica y Cumplimiento ESLint:**
  - Refactorización de `useAiLoadingStages` en `AiAnalysisLoadingSkeleton.tsx` a estado derivado puro (`effectiveIndex`), eliminando sincronizaciones secundarias con `setState` en efectos y resolviendo las reglas `react-hooks/set-state-in-effect` y `react-hooks/exhaustive-deps`.
- **Integración de Pruebas Automatizadas:**
  - Actualización de `src/integration/aiWorkflow.test.ts` verificando la presencia estricta de `AiAnalysisLoadingSkeleton` y el modal `ai-analysis-modal` en la pantalla de resultados.

### Commit 99 — Banner y Feedback Amigable para Límites de Cuota de IA en UI
- **Componente y Utilidad de Cuotas:** `src/components/ui/AiQuotaAlertBanner.tsx`
  - Función de mapeo semántico `getAiQuotaFeedback(scopeOrCode)` que traduce las respuestas HTTP 429 de la Edge Function y de base de datos a mensajes educativos y tranquilizadores:
    * `global_minute`: Límite de solicitudes por minuto alcanzado; indica tiempo de espera breve (~1 min) con acción directa de reintento.
    * `global_day`: Límite diario global del sistema; notifica que las cuotas se restablecerán en las próximas 24 horas.
    * `user_day`: Cuota diaria de usuario alcanzada; informa de forma clara el reinicio al día siguiente para asegurar uso equitativo.
    * `comparison_day`: Límite diario para la comparación específica; previene abusos sobre el mismo par fotográfico.
    * `provider_quota_exceeded`: Sobrecarga temporal del proveedor Gemini; ofrece retroalimentación precisa sin alarmar al usuario.
    * `usage_limit_reached` (fallback seguro): Mensaje genérico tranquilizador.
  - Mensaje de seguridad integrado: confirma explícitamente que las fotografías "Antes" y "Después" permanecen intactas y guardadas en la nube.
  - Botón de reintento adaptativo: permite reintentar el análisis inmediatamente tras límites por minuto o saturación temporal.
  - Implementación con Design Tokens estrictos (`Colors.warning`, `Colors.warningSoft`, `Spacing`, `Radius`, `Typography`).
- **Integración en Comparison Result:** `src/app/comparison-result.tsx`
  - Se desacopló la función `executeAnalysisRequest()` para posibilitar reintentos directos desde el banner de cuota.
  - Presentación de `AiQuotaAlertBanner` cuando `analysisStatus === "limited"`, conservando `styles.errorCard` para fallos genéricos o de red.
  - Captura y propagación de `scope` en `AnalysisServiceError` (`src/services/analysisService.ts`), preservando detalles de cuota provistos por el backend.
- **Suite de Pruebas Unitarias y de Integración:**
  - `src/components/ui/AiQuotaAlertBanner.test.tsx`: 9 pruebas unitarias que validan el mapeo de cada alcance de cuota, el renderizado del banner, mensajes de seguridad y botones de reintento.
  - `src/services/analysisService.test.ts`: prueba añadida para comprobar que el `scope` del error 429 se preserva en `AnalysisServiceError`.
  - `src/integration/aiWorkflow.test.ts`: verificación de la presencia del componente `AiQuotaAlertBanner` en la pantalla de resultados.

### Commit 100 — HITO CENTENARIO: Detección Proactiva de Modo Offline y Resiliencia de Red en Análisis de IA
- **Celebración de Hito:** ¡El repositorio VisualTrace Mobile alcanza oficialmente los 100 commits! Consolidando un estándar estricto de calidad, arquitectura desacoplada, seguridad RLS multi-tenant y cero errores en CI/CD.
- **Detección Proactiva y Manejo Offline en Workflow:** `src/services/analysisWorkflow.ts`
  - Incorporación del estado `network_offline` en `AnalysisStatus`, mapeado a la acción `analyze` con etiqueta contextual "Reintentar conexión".
  - Creación de la clase `NetworkOfflineError` y función pura de inspección `isNetworkError(error)` para categorizar fallos de conectividad, caídas de socket, errores de fetch o interrupciones de red.
  - Inyección de comprobación de conectividad (`checkOnline` / `defaultNetworkChecker`) previa a la solicitud de red, abortando proactivamente solicitudes innecesarias hacia Supabase Edge Functions y protegiendo el ancho de banda y la experiencia del usuario.
- **Capa Visual y Experiencia de Usuario:** `src/app/comparison-result.tsx`
  - Detección reactiva de modo offline: si la red falla antes o durante la inferencia, se captura limpiamente el error, se cierra de inmediato el modal de carga bloqueante (evitando congelar la interfaz) y se presenta la tarjeta responsiva de aviso offline (`ai-offline-banner`).
  - Tarjeta con Design Tokens (`Colors.surfaceBlue`, `Colors.secondary`, `Colors.secondarySoft`, `Radius.lg`, `Spacing.lg`), badge "Offline", mensaje tranquilizador (confirmando que las fotos locales están 100% seguras) y botón destacado "Reintentar conexión".
- **Suite de Pruebas Automatizadas:**
  - `src/services/analysisWorkflow.test.ts`: 5 nuevas pruebas unitarias (19 pruebas en total en el archivo) que verifican el mapeo de estados, `NetworkOfflineError` proactivo, ejecución condicional según conectividad, identificación exhaustiva de errores de red y transiciones de recuperación.
  - `src/integration/aiWorkflow.test.ts`: validación contractual en la pantalla de resultados de los componentes de UI offline (`ai-offline-banner` y botón de reintento).
- **Estado Actual del Repositorio (Commit 100):**
  - 232 pruebas automatizadas superadas (`23/23` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 101 — Acción de Copiado de Informe de IA con Feedback Visual Temporal
- **Módulo y Utilidades de Exportación:** `src/utils/reportExport.ts`
  - Función pura `formatReportForClipboard(report, options)` que convierte el resultado del análisis de IA (`GeminiAnalysisReport`) en un texto limpio, legible y estructurado para compartir o archivar externamente (mensajería, correo, blocs de notas).
  - Incluye encabezado contextual ("INFORME DE ANÁLISIS COMPARATIVO — VISUALTRACE"), nombre de la comparación si existe, resumen ejecutivo, listado numerado con etiquetas semánticas de diferencias detectadas (`CATEGORY_LABELS`), viñetas de observaciones, limitaciones/incertidumbres detectadas y nota de descargo para revisión humana.
  - Función asíncrona `copyReportToClipboard(report, options)` con captura de excepciones para invocar de forma segura la API nativa de `expo-clipboard` (`Clipboard.setStringAsync`) garantizando cero caídas ante rechazos de permisos en el portapapeles.
  - Centralización de `CATEGORY_LABELS` como fuente única de verdad para categorías visuales (`added`, `removed`, `modified`, `moved`, `appearance`, `other`).
- **Integración en Comparison Result:** `src/app/comparison-result.tsx`
  - Botón de acción interactivo `copy-report-button` ("📋 Copiar informe" / "✓ Copiado") ubicado en la cabecera de la tarjeta del informe de IA (`reportCard`).
  - Retroalimentación visual temporal mediante insignia contextual `copied-feedback-badge` ("¡Copiado al portapapeles!") mostrada durante 2.5 segundos con accesibilidad nativa (`accessibilityLiveRegion="polite"`).
  - Limpieza de temporizadores en desmontaje mediante `copyTimerRef` y validación de montaje con `analysisMountedRef.current`, previniendo fugas de memoria o actualizaciones de estado huérfanas.
  - Implementación con tokens de diseño rigurosos (`Colors.primarySoft`, `Colors.successSoft`, `Colors.successDark`, `Radius.full`, `Radius.md`, `Spacing`, `Typography`).
- **Suite de Pruebas Automatizadas:**
  - `src/utils/reportExport.test.ts`: 5 pruebas unitarias que validan el formateo completo de reportes, formateo sin nombre de comparación, manejo limpio de informes sin diferencias ni observaciones, copia asíncrona al portapapeles y captura de errores sin lanzar excepciones no controladas.
  - `src/integration/aiWorkflow.test.ts`: validación contractual en la pantalla de resultados de los identificadores `copy-report-button`, `copied-feedback-badge`, etiquetas de usuario y formateo limpio integrado.
- **Estado Actual del Repositorio (Commit 101):**
  - 238 pruebas automatizadas superadas (`24/24` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 102 — Compartición Nativa de Informes de IA mediante Share API
- **Extensión del Módulo de Exportación:** `src/utils/reportExport.ts`
  - Función asíncrona `shareReportNative(report, options)` que aprovecha la API estándar `Share.share` de React Native para compartir el informe estructurado a aplicaciones del sistema (WhatsApp, Gmail, Slack, Drive, Mensajes, etc.).
  - Incluye metadatos enriquecidos (`title`, `dialogTitle`, `subject` y texto formateado completo).
  - Manejo resiliente de cancelaciones y descartes del usuario (`Share.dismissedAction`) y captura defensiva de excepciones (`try/catch`), retornando `{ success, action, activityType, error }` sin arrojar errores no capturados ni romper la experiencia de usuario.
- **Integración de UI en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Botón de acción interactivo `share-report-button` ("↗ Compartir") integrado en el encabezado `reportHeaderActions` junto al botón de copia.
  - Estado `isSharingReport` para prevenir invocaciones simultáneas o bloqueos al abrir el diálogo nativo de compartición.
  - Diseño responsivo y coherente con flex-wrap, espaciado con design tokens (`Colors.surfaceSecondary`, `Colors.border`, `Radius.full`, `Spacing`, `Typography`).
- **Suite de Pruebas Automatizadas:**
  - `src/utils/reportExport.test.ts`: 3 nuevas pruebas unitarias (8 pruebas en total en el archivo) que verifican la invocación exitosa de `Share.share` con metadatos completos, la cancelación/descarte de usuario segura (`dismissedAction`) y la captura de errores del sistema sin excepciones.
  - `src/integration/aiWorkflow.test.ts`: validación contractual en la pantalla de resultados del identificador `share-report-button`, etiquetas de accesibilidad y verificación de flujo de compartición integrado.
- **Estado Actual del Repositorio (Commit 102):**
  - 241 pruebas automatizadas superadas (`24/24` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 103 — Desglose de Diferencias en Secciones Desplegables / Colapsables por Categoría
- **Componente Desacoplado de UI:** `src/components/ui/AiDifferencesCollapsible.tsx`
  - Función pura de agrupación `groupDifferencesByCategory(differences)` que organiza los hallazgos en grupos categorizados (`added`, `removed`, `modified`, `moved`, `appearance`, `other`) preservando el orden y asignando etiquetas amigables en español.
  - Gestión de estado interactivo granular mediante mapa `expandedCategories: Record<string, boolean>` y opción global `toggleAll`, permitiendo abrir o cerrar el detalle de categorías individuales o de forma masiva sin saturar el desplazamiento vertical.
  - Indicadores visuales y badges numéricos por categoría (`categoryCountBadge`) y totales de cambios detectados.
  - Botón de alternancia contextual con texto e íconos dinámicos ("Ver detalles ▾" / "Ocultar detalles ▴") y estado de accesibilidad enriquecido (`accessibilityState={{ expanded }}`).
  - Estructuración limpia de ítems detallados con viñetas estilizadas en contenedores `surfaceBlue` y tipografía jerárquica con tokens de diseño (`Colors`, `Radius.lg`, `Radius.md`, `Spacing`, `Typography`).
- **Integración en la Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Reemplazo del listado plano continuo previo por el componente `AiDifferencesCollapsible`, optimizando drásticamente la ergonomía del scroll vertical en informes extensos.
  - Eliminación de importaciones y estilos no utilizados, garantizando conformidad estricta con ESLint y TypeScript.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiDifferencesCollapsible.test.tsx`: 5 pruebas unitarias que validan la función pura de agrupación, el estado inicial colapsado, el despliegue con `initialExpanded={true}` y el renderizado del mensaje ante ausencia de diferencias visibles.
  - `src/integration/aiWorkflow.test.ts`: prueba de integración contractual que valida la presencia de `AiDifferencesCollapsible` en `comparison-result.tsx` y simula la alternancia entre estados colapsado/expandido con el reporte de inferencia de Gemini.
- **Estado Actual del Repositorio (Commit 103):**
  - 247 pruebas automatizadas superadas (`25/25` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 104 — Modal de Confirmación y Advertencia de Cuota para Re-análisis de IA
- **Componente Desacoplado de Confirmación:** `src/components/ui/AiReanalyzeConfirmationModal.tsx`
  - Diálogo modal accesible (`testID="reanalyze-confirmation-modal"`) que previene el consumo accidental de cuotas antes de volver a solicitar inferencia a Gemini Flash.
  - Insignia contextual de advertencia ("Consume 1 intento de cuota") y cuadro informativo detallando los requisitos: consumo de 1 intento de cuota diaria, requerimiento de conexión a internet activa y preservación intacta de las fotos originales.
  - Acciones claras con botones interactivos "Cancelar" (`reanalyze-cancel-button`) y "Confirmar re-análisis" (`reanalyze-confirm-button`).
  - Implementación con tokens de diseño estrictos (`Colors.surface`, `Colors.warning`, `Colors.warningSoft`, `Colors.primary`, `Radius.xl`, `Radius.lg`, `Spacing`, `Typography`).
- **Integración en la Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Botón de re-análisis interactivo `reanalyze-button` ("🔄 Re-analizar comparación") en el footer cuando ya existe un informe guardado.
  - Control de estado `showReanalyzeModal`, callbacks `handleRequestReanalysis`, `handleCancelReanalysis`, `handleConfirmReanalysis` e integración en el gestor de retroceso `handleBack` para descarte con botón físico sin salir de la pantalla.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiReanalyzeConfirmationModal.test.tsx`: 2 pruebas unitarias que verifican el renderizado del diálogo de advertencia, títulos, insignias de cuota, textos de confirmación y el descarte cuando `visible={false}`.
  - `src/integration/aiWorkflow.test.ts`: prueba contractual de integración que valida la presencia del botón de re-análisis, la integración de `AiReanalyzeConfirmationModal` y la estructura de advertencias y botones del modal.
- **Estado Actual del Repositorio:**
  - 250 pruebas automatizadas superadas (`26/26` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).
