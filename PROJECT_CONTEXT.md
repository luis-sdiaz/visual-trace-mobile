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
- **Test Runner:** [Vitest](https://vitest.dev/) `5.0.4` (441 pruebas unitarias y de integración en 58 suites que validan componentes UI, contratos, utilidades, servicios y Edge Functions al 100%).
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
- **Estado Actual del Repositorio (Commit 104):**
  - 250 pruebas automatizadas superadas (`26/26` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 105 — Tarjeta de Retroalimentación y Valoración del Informe de IA
- **Componente Desacoplado de Feedback:** `src/components/ui/AiReportFeedbackCard.tsx`
  - Tarjeta contextual de retroalimentación (`testID="ai-report-feedback-card"`) que consulta al usuario: *"¿Te resultó útil este análisis?"*.
  - Botones interactivos con badges y emojis ("Útil" 👍 con `testID="feedback-useful-button"` y "No útil" 👎 con `testID="feedback-not-useful-button"`), dotados de atributos de accesibilidad completos (`accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint` y `accessibilityState={{ selected }}`).
  - Manejo de estado reactivo y memoria de sesión en memoria (`sessionFeedbackStore`, `getSessionFeedback`, `setSessionFeedback`, `clearSessionFeedback`) indexado por identificador de comparación (`comparisonId`), recordando la respuesta seleccionada por el usuario.
  - Indicador visual contextual de confirmación y agradecimiento (`testID="feedback-thank-you-message"`, *"¡Gracias por tu retroalimentación!"*) desplegado de forma accesible con `accessibilityLiveRegion="polite"` y tokens de diseño (`Colors.surfaceBlue`, `Colors.successSoft`, `Colors.success`, `Radius.lg`, `Radius.md`, `Radius.full`, `Spacing`, `Typography`).
- **Integración en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Incorporación de `<AiReportFeedbackCard comparisonId={comparisonId ?? undefined} />` al final del informe de IA dentro de la tarjeta de reporte, sucediendo al aviso de revisión humana.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiReportFeedbackCard.test.tsx`: 8 pruebas unitarias exhaustivas que cubren el almacenamiento y recuperación en sesión, limpieza del caché, renderizado inicial de preguntas y botones, renderizado condicional del mensaje de agradecimiento ante selección `"useful"` o `"not_useful"`, persistencia con `comparisonId` y atributos de accesibilidad (`aria-label`).
  - `src/integration/aiWorkflow.test.ts`: prueba contractual y funcional de integración que valida la presencia de `AiReportFeedbackCard` en la pantalla de resultados, la estructura de testIDs de los botones, la visualización del agradecimiento y la persistencia de sesión integrada.
- **Estado Actual del Repositorio (Commit 105):**
  - 259 pruebas automatizadas superadas (`27/27` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 106 — Resumen Ejecutivo y Evaluación de Severidad e Impacto Visual
- **Componente Desacoplado de Resumen de Impacto:** `src/components/ui/AiAnalysisSummaryCard.tsx`
  - Tarjeta ejecutiva (`testID="ai-analysis-summary-card"`) concebida como encabezado visual del informe comparativo de IA.
  - Función de evaluación y cálculo de severidad visual `calculateVisualSeverity(differences, hasVisibleChanges)` que categoriza el impacto en 4 niveles bien definidos:
    - `"Sin cambios"` (`level: "none"`): fotografías sin discrepancias visibles detectadas (`statusLabel: "Sin alteraciones"`).
    - `"Menor"` (`level: "minor"`): discrepancias puntuales o de baja escala que no alteran la estructura general (`statusLabel: "Cambios leves"`).
    - `"Moderado"` (`level: "moderate"`): modificaciones apreciables que alteran el estado o composición visual (`statusLabel: "Cambios moderados"`).
    - `"Significativo"` (`level: "significant"`): múltiples diferencias estructurales o cambios de alta relevancia detectados (`statusLabel: "Cambios relevantes"`).
  - Badge visual de severidad (`testID="severity-level-badge"`) estilizado dinámicamente con tokens de diseño (`Colors`, `Radius.full`, `Spacing`, `Typography`).
  - Bloque métrico conciso con 3 indicadores clave: total de hallazgos detectados (`testID="total-findings-indicator"`), estado general de la comparación (`testID="comparison-status-indicator"`) y número de categorías afectadas (`testID="affected-categories-indicator"`).
- **Integración en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Inserción de `<AiAnalysisSummaryCard report={analysisReport} />` como encabezado visual del bloque del informe, situado inmediatamente antes del resumen narrativo de IA.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiAnalysisSummaryCard.test.tsx`: 8 pruebas unitarias que validan la función pura `calculateVisualSeverity` en los 4 niveles de impacto ("Sin cambios", "Menor", "Moderado", "Significativo"), el manejo seguro de reportes nulos/indefinidos, la compatibilidad con tipos directos `GeminiAnalysisReport` y envoltorios `AnalysisReportRecord`, y el renderizado de todos los testIDs e indicadores.
  - `src/integration/aiWorkflow.test.ts`: prueba contractual y funcional de integración que valida la presencia de `AiAnalysisSummaryCard` en la pantalla de resultados, la derivación de severidad y el renderizado de indicadores y badges con datos reales de inferencia.
- **Estado Actual del Repositorio (Commit 106):**
  - 268 pruebas automatizadas superadas (`28/28` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 107 — Banner Desacoplado de Resiliencia y Recuperación ante Modo Offline en IA
- **Componente Desacoplado de Resiliencia Offline:** `src/components/ui/AiOfflineResilienceBanner.tsx`
  - Banner interactivo y accesible (`testID="ai-offline-resilience-banner"`, `accessibilityRole="alert"`) que informa al usuario cuando no hay conectividad a internet para procesar la petición de IA hacia Supabase Edge Functions y Google Gemini.
  - Título y mensajes contextuales claros (*"Sin conexión a internet para el análisis de IA"*), insignia de estado (`"Offline"`) e indicaciones de comprobación de conectividad local (Wi-Fi o datos móviles), ratificando la preservación segura de las fotografías del dispositivo.
  - Botón de acción interactivo *"Reintentar"* (`testID="retry-network-action-button"`, `accessibilityLabel="Reintentar conexión"`), con feedback de carga mediante `ActivityIndicator` cuando `isRetrying` se encuentra activo.
  - Implementación con tokens de diseño del proyecto (`Colors.surfaceBlue`, `Colors.secondary`, `Colors.secondarySoft`, `Colors.primary`, `Radius.lg`, `Radius.md`, `Radius.full`, `Spacing`, `Typography`).
- **Integración y Limpieza en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Reemplazo del bloque inline previo por `<AiOfflineResilienceBanner onRetry={() => void executeAnalysisRequest()} />`, depurando los estilos heredados obsoletos.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiOfflineResilienceBanner.test.tsx`: 6 pruebas unitarias que cubren el renderizado por defecto, títulos y descripciones personalizadas, descarte opcional del botón cuando no hay callback, indicador de progreso y roles de accesibilidad (`role="alert"` y `aria-label`).
  - `src/integration/aiWorkflow.test.ts`: 28 pruebas de integración contractual que verifican la presencia de `AiOfflineResilienceBanner` en la pantalla de resultados, los testIDs del banner y del botón de reintento, el contrato de mensaje offline y la ejecución del callback de reintento ante restablecimiento de red.
- **Estado Actual del Repositorio (Commit 107):**
  - 275 pruebas automatizadas superadas (`29/29` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 108 — Tarjeta de Fallback para Errores Genéricos de API de IA con Panel de Detalles Técnicos
- **Componente Desacoplado de Fallback de Errores:** `src/components/ui/AiAnalysisErrorFallbackCard.tsx`
  - Tarjeta accesible (`testID="ai-analysis-error-fallback-card"`, `accessibilityRole="alert"`) que gestiona visualmente fallos imprevistos, excepciones de red no cubiertas o errores de API devueltos por Supabase o Gemini.
  - Título claro y directo (*"Ocurrió un inconveniente al procesar el análisis"*), con lista estructurada de sugerencias de solución prácticas (reintentar en unos segundos, validar fotos inicial y final, y comprobar servicios en la nube).
  - Botón de acción interactivo *"Reintentar análisis"* (`testID="retry-analysis-button"`, `accessibilityLabel="Reintentar análisis"`), con soporte para estado de carga `isRetrying` mediante `ActivityIndicator`.
  - Panel colapsable de detalles técnicos opcional (`testID="toggle-error-details-button"` y `testID="error-technical-details"`), permitiendo al usuario u operador inspeccionar el mensaje de error del sistema sin sobrecargar la vista principal.
  - Diseño coherente con tokens de diseño del proyecto (`Colors.dangerSoft`, `Colors.danger`, `Colors.surface`, `Colors.primary`, `Radius.lg`, `Radius.md`, `Spacing`, `Typography`).
- **Integración en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Integración de `<AiAnalysisErrorFallbackCard errorMessage={analysisMessage} onRetry={() => void executeAnalysisRequest()} />` en sustitución del renderizado textual básico (`errorCard` / `feedbackText`).
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiAnalysisErrorFallbackCard.test.tsx`: 9 pruebas unitarias que validan el renderizado predeterminado, títulos y sugerencias personalizadas, descarte del botón de reintento, estado colapsado y desplegado de los detalles técnicos, indicador de progreso y roles de accesibilidad (`role="alert"` y `aria-label`).
  - `src/integration/aiWorkflow.test.ts`: 29 pruebas de integración contractual que verifican la presencia de `AiAnalysisErrorFallbackCard` en la pantalla de resultados, los testIDs de reintento y alternancia de detalles, y la invocación del callback de reintento.
- **Estado Actual del Repositorio (Commit 108):**
  - 285 pruebas automatizadas superadas (`30/30` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 109 — Modal de Cuota Diaria Agotada con Estimación de Reinicio y Acciones de Navegación
- **Componente Desacoplado de Cuota Agotada:** `src/components/ui/AiQuotaLimitExceededModal.tsx`
  - Diálogo modal accesible (`testID="ai-quota-limit-exceeded-modal"`, `accessibilityViewIsModal`) para notificar de manera clara y amigable cuando se agotan los intentos de análisis diario.
  - Título contextual (*"Límite diario de análisis alcanzado"*), insignia informativa (*"Cuota de IA"*) y descripción confirmando que las fotografías y datos locales se encuentran protegidos.
  - Indicador estilizado de estimación de reinicio de cuota (`testID="quota-reset-time-indicator"`), con tiempo dinámico o predeterminado (*"Se restablece a la medianoche (00:00 UTC)"*).
  - Guía de sugerencias de uso local (captura y organización continua de fotos, comparación manual lado a lado y seguridad de datos locales).
  - Botones de acción accesibles: *"Entendido"* (`testID="quota-exceeded-close-button"`) para cerrar el diálogo, y *"Ver historial de comparaciones"* (`testID="quota-exceeded-history-button"`) para redirigir al listado principal.
  - Diseño fiel a los tokens de diseño (`Colors.surface`, `Colors.surfaceBlue`, `Colors.warningSoft`, `Colors.primary`, `Radius.xl`, `Radius.md`, `Spacing`, `Typography`).
- **Integración en Pantalla de Resultados:** `src/app/comparison-result.tsx`
  - Manejo de estado reactivo `showQuotaExceededModal`, apertura automática ante captura de error de cuota `isQuota` en `executeAnalysisRequest`, navegación a historial/home y control de cierre prioritario con el botón físico de retroceso Android en `handleBack`.
- **Suite de Pruebas Automatizadas:**
  - `src/components/ui/AiQuotaLimitExceededModal.test.tsx`: 6 pruebas unitarias que validan el renderizado del modal, indicador de tiempo de reinicio, sugerencias locales, botones de acción, estado oculto cuando `visible={false}` y roles de accesibilidad.
  - `src/integration/aiWorkflow.test.ts`: 30 pruebas de integración contractual que verifican la presencia del modal en la pantalla de resultados, sus identificadores testID y el comportamiento interactivo de sus botones de acción.
- **Estado Actual del Repositorio (Commit 109):**
  - 292 pruebas automatizadas superadas (`31/31` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).

### Commit 110 — Cierre de Fase 2 (Bloque D: UX y Resiliencia del Módulo de IA) y Consolidación Integral
- **Revisión, Auditoría y Consolidación de UI en Bloque D:**
  - Verificación y certificación de los componentes UI y modales del módulo de IA:
    1. `AiAnalysisLoadingSkeleton.tsx`: esqueleto visual responsivo y rotación progresiva de etapas de inferencia.
    2. `AiDifferencesCollapsible.tsx`: tarjetas desplegables/colapsables por categoría con badges numéricos de hallazgos.
    3. `AiAnalysisSummaryCard.tsx`: evaluación ejecutiva y cálculo determinista de severidad visual (4 niveles: Sin cambios, Menor, Moderado, Significativo) con indicadores de impacto.
    4. `AiReportFeedbackCard.tsx`: retroalimentación contextual del usuario con persistencia en memoria durante la sesión indexada por comparación.
    5. `AiQuotaAlertBanner.tsx`: banner informativo ante límites de cuota por minuto o por día con mapeo amigable.
    6. `AiOfflineResilienceBanner.tsx`: banner de detección y resiliencia offline con botón de reintento interactivo.
    7. `AiAnalysisErrorFallbackCard.tsx`: tarjeta de fallback para fallos imprevistos de API con panel colapsable de detalles técnicos.
    8. `AiQuotaLimitExceededModal.tsx`: diálogo modal de cuota agotada con estimación de tiempo de reinicio, sugerencias de uso local y navegación fluida al historial.
    9. `AiReanalyzeConfirmationModal.tsx`: diálogo modal preventivo con advertencia de cuota antes de re-analizar.
- **Integración y Arquitectura en `src/app/comparison-result.tsx`:**
  - Flujo de presentación ordenado, desacoplado y sin código muerto ni estilos huérfanos.
  - Integración armónica de los design tokens del proyecto (`Colors`, `Spacing`, `Radius`, `Typography`).
  - Gestión robusta del botón de retroceso (`handleBack` y `BackHandler`) que prioriza el descarte seguro de modales superpuestos.
- **Suite de Pruebas Automatizadas y Cobertura:**
  - 31 suites de pruebas ejecutadas de forma 100% aislada y paralela.
  - 292 pruebas automatizadas superadas con éxito (`31/31` suites en verde).
  - 0 errores de compilación estricta de TypeScript (`npx tsc --noEmit` exit 0).
  - 0 advertencias o errores de análisis estático con ESLint (`npx eslint .` exit 0).
- **Estado Actual del Repositorio:**
  - 292 pruebas automatizadas superadas (`31/31` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).
  - **Fase 2 (Módulo de Análisis Comparativo con IA y Resiliencia UX) oficialmente CERRADA Y CONSOLIDADA.**

## Fase 3 — Exportación, Historial Avanzado y Auditoría Profesional

### Bloque 1: Módulo de Exportación y Compartición de Informes en PDF/Imagen (Commits 111 al 121)

#### Commit 111 — Contratos e Interfaces TypeScript de Exportación
- **Archivo Creado:** `src/contracts/reportExport.ts`
  - Definición de tipos formales para exportación (`ExportFormat`, `PageSize`, `ExportReportImages`, `ExportReportMetadata`, `ExportReportData`, `ExportReportOptions`, `ExportReportResult`).
  - Funciones utilitarias: `sanitizeFilename`, `isExportReportData`, `validateExportOptions` con valores predeterminados seguros (`DEFAULT_EXPORT_OPTIONS`).
- **Suite de Pruebas:** `src/contracts/reportExport.test.ts` (11 pruebas unitarias cubriendo sanitización de nombres, validación de opciones y contratos de datos).

#### Commits 112, 113 y 114 — Plantilla HTML Estilizada con Design Tokens y Renderizado de Imágenes
- **Archivo Creado:** `src/utils/reportExportTemplate.ts`
  - Commit 112: Generación base del documento HTML estructurado con sanitización XSS estricta (`escapeHtml`) y formateo de fechas (`formatReportDate`).
  - Commit 113: Integración de Design Tokens de la aplicación (`Colors.primary`, `Colors.background`, `Colors.surface`, `Colors.border`, `Spacing`, `Radius`, `Typography`) y reglas CSS de impresión (`@page`, `@media print`, `page-break-inside: avoid`). Insignia ejecutiva de severidad visual basada en `calculateVisualSeverity`.
  - Commit 114: Normalización y renderizado de imágenes comparativas (`normalizeImageSource`) con soporte para esquemas `data:image/...;base64`, `http(s)://` y `file://`, en un grid visual responsivo con etiquetas de estado ("Estado Inicial" / "Estado Final").
- **Suite de Pruebas:** `src/utils/reportExportTemplate.test.ts` (11 pruebas unitarias validando escape HTML, formato de fechas, normalización de imágenes, omisión selectiva y protección anti-XSS).

#### Commits 115, 116 y 119 — Servicio de Conversión PDF con Expo Print, Expo Sharing y Manejo de Excepciones
- **Dependencias Oficiales Incorporadas:** `expo-print` (~57.0.2) y `expo-sharing` (~57.0.24).
- **Archivo Creado:** `src/services/reportExportService.ts`
  - Commit 115: Implementación de `generatePdfReport` mediante `Print.printToFileAsync` y `sharePdfReport` mediante `Sharing.shareAsync`.
  - Commit 116: Pruebas unitarias completas con simulación y aislamiento de `expo-print`, `expo-sharing` y `expo-file-system`.
  - Commit 119: Resolución segura de imágenes en disco a Base64 (`resolveImageToBase64` vía `FileSystem.readAsStringAsync`), tolerancia ante archivos faltantes, gestión amigable de cancelaciones nativas y verificación de capacidades multiplataforma (`checkStorageAndSharingCapabilities`).
- **Suite de Pruebas:** `src/services/reportExportService.test.ts` (17 pruebas unitarias cubriendo resolución de imagen, conversión PDF, compartición nativa, fallback sin share sheet y control de errores).

#### Commits 117, 118 y 120 — Componentes UI de Exportación: Botón con Estado de Carga y Modal de Previsualización
- **Componente de Botón:** `src/components/ui/ExportReportButton.tsx` (Commit 117)
  - Botón accesible con soporte para estados `isLoading`, indicador `ActivityIndicator`, diseño desacoplado (`variant="outline"|"primary"|"secondary"`) y tokens de diseño coherentes con la barra de acciones de la pantalla.
- **Componente de Modal de Previsualización:** `src/components/ui/ReportPreviewModal.tsx` (Commit 118)
  - Diálogo modal accesible (`testID="report-preview-modal"`, `accessibilityViewIsModal`) para previsualizar el título, fecha, badge de severidad visual, miniaturas comparativas, resumen ejecutivo y conteo de hallazgos antes de compartir el PDF.
- **Suite de Pruebas UI:** (Commit 120)
  - `src/components/ui/ExportReportButton.test.tsx` (5 pruebas unitarias).
  - `src/components/ui/ReportPreviewModal.test.tsx` (5 pruebas unitarias).

#### Commit 121 — Integración en Pantalla de Resultados y Cierre de Bloque 1
- **Integración en Pantalla:** `src/app/comparison-result.tsx`
  - Incorporación de `ExportReportButton` (`testID="export-pdf-report-button"`) en `reportHeaderActions` junto a los botones de copiar y compartir texto.
  - Integración de `ReportPreviewModal` con estados reactivos `showPreviewModal` e `isExportingPdf`.
  - Prioridad de descarte en el botón de retroceso de hardware (`handleBack`).
- **Prueba de Integración Contractual:** `src/integration/aiWorkflow.test.ts` (verificación de presencia de componentes y llamadas de servicio).
- **Estado al Cierre del Bloque 1 (Commit 121):**
  - 342 pruebas automatizadas superadas (`36/36` suites en verde).
  - **Fase 3 (Bloque 1: Módulo de Exportación y Compartición de Informes en PDF/Imagen) oficialmente CERRADO Y CONSOLIDADO.**

### Bloque 2: Optimización de Rendimiento, Caché y Gestión de Memoria en Dispositivos Móviles (Commits 122 al 135)

#### Commit 122 — Servicio de Purga y Rotación de Caché
- **Archivo Creado:** `src/services/imageCacheService.ts`
  - Gestión y rotación de imágenes temporales almacenadas en el sistema de archivos local (`FileSystem.cacheDirectory` / `vt-image-cache/`).
  - Cuota configurable (50 MB máximo, 24 horas de vigencia predeterminada) con algoritmo de rotación LRU por fecha de modificación.
  - Métricas de almacenamiento en caché (`getImageCacheMetrics`), purga selectiva por antigüedad (`purgeOldImageCache`) y borrado total (`clearAllImageCache`).
- **Suite de Pruebas:** `src/services/imageCacheService.test.ts` (9 pruebas unitarias cubriendo formateo de bytes, directorio de caché, métricas y rotación LRU).

#### Commit 123 — Hook de Monitoreo de Memoria y Limpieza
- **Archivo Creado:** `src/hooks/useImageMemoryCleanup.ts`
  - Monitoreo del ciclo de vida de URIs de vistas previas e imágenes temporales.
  - Revocación automática de Object URLs (`blob:`) y eliminación idempotente de archivos temporales en caché al desmontar componentes o navegar pantallas.
- **Suite de Pruebas:** `src/hooks/useImageMemoryCleanup.test.ts` (4 pruebas unitarias validando filtrado inicial, registro dinámico, descarte y revocación).

#### Commit 124 — Optimización de Compresión Previa de Imágenes
- **Archivo Modificado:** `src/utils/imageSelection.ts`
  - Límites de calidad JPEG configurables y sanitizados (`sanitizeCompressionQuality`) con rango seguro entre `0.3` y `0.95` (calidad estándar `0.8`).
  - Parámetros opcionales en `selectComparisonPhoto` para optimizar peso en memoria y disco sin perder nitidez de análisis.
- **Suite de Pruebas:** `src/utils/imageSelection.test.ts` (13 pruebas unitarias con cobertura de clamping y preservación de umbrales).

#### Commit 125 — Memoización de Componentes en Lista Histórica
- **Archivo Modificado:** `src/components/ui/ComparisonPreview.tsx`
  - Optimización con `React.memo` para prevenir re-renderizados innecesarios ante actualizaciones del estado global o padre.
- **Suite de Pruebas:** `src/components/ui/ComparisonPreview.test.tsx` (2 pruebas unitarias certificando renderizado estático y memoización).

#### Commit 126 — Paginación y Smooth Scrolling en Historial con FlatList
- **Archivo Modificado:** `src/app/home.tsx`
  - Sustitución de renderizado manual `.map()` por `FlatList` virtualizada.
  - Parámetros de optimización móvil aplicados: `maxToRenderPerBatch={8}`, `windowSize={5}`, `removeClippedSubviews={true}` e `initialNumToRender={6}`.

#### Commit 127 — Componente Indicador de Almacenamiento Local
- **Archivo Creado:** `src/components/ui/StorageUsageBanner.tsx`
  - Banner estilizado con tokens del sistema (`Colors`, `Radius`, `Spacing`, `Typography`) para visualizar el espacio de caché consumido.
  - Acción interactiva accesible para liberar espacio (`clear-cache-button`) con retroalimentación inmediata.
- **Suite de Pruebas:** `src/components/ui/StorageUsageBanner.test.tsx` (3 pruebas unitarias).

#### Commit 128 — Integración de Purga de Caché en Inicio y Sesión
- **Archivo Modificado:** `src/context/AuthContext.tsx`
  - Purga automática en segundo plano de imágenes temporales caducadas durante el arranque de la sesión y al cerrar sesión (`signOut`).
- **Función Modular:** `handleSessionCachePurge` tolerante a fallos.

#### Commits 129 a 131 — Suites de Pruebas de Rendimiento, Integración y Cierre del Bloque 2
- **Commit 129:** Pruebas de límites de cuota y rotación en `src/services/imageCacheService.test.ts`.
- **Commit 130:** Pruebas de integración de purga de sesión en `src/context/AuthContext.test.tsx` (4 pruebas).
- **Commit 131:** Pruebas de rendimiento, memoización y cierre del Bloque 2 de optimización y caché.
- **Estado al Cierre del Bloque 2 (Commit 131):**
  - 374 pruebas automatizadas superadas (`42/42` suites en verde).
  - Verificación de tipos TypeScript estricta sin emisiones (`npx tsc --noEmit` exit 0).
  - Verificación estática con ESLint al 100% limpia sin errores ni advertencias (`npx eslint .` exit 0).
  - **Fase 3 (Bloque 2: Optimización de Rendimiento, Caché y Gestión de Memoria en Dispositivos Móviles) oficialmente CERRADO Y CONSOLIDADO.**

### Bloque 3: Módulo de Demostración Académica, Mocks de Red y Resiliencia para Sustentación (Commits 132 al 145)

#### Commit 132 — Configuración de Modo Demostración Académica
- **Archivo Creado:** `src/config/demoConfig.ts`
  - Definición de tipos formales para demostración académica: `DemoNetworkCondition`, `DemoMockScenario`, `DemoModeOptions` y `AcademicDemoState`.
  - Gestor de estado en memoria con patrón observador (`subscribeDemoConfig`), lectura pura (`getDemoState`, `isDemoModeActive`), mutación controlada (`setDemoState`), restablecimiento (`resetDemoConfig`) y telemetría de simulación (`recordMockServed`).
- **Suite de Pruebas:** `src/config/demoConfig.test.ts` (5 pruebas unitarias).

#### Commit 133 — Interceptor de Mocks de la API Gemini
- **Archivo Creado:** `src/services/aiMockService.ts`
  - Generador de reportes deterministas tipados cumpliendo estrictamente con el contrato `GeminiAnalysisReport` (`v1.0`).
  - Escenarios temáticos preconfigurados para sustentación: `changes_detected` (hallazgos estructurales y pluviales), `no_changes` (estado idéntico), `structural_defect` (alerta crítica con fisuras y cortante) y `minor_cosmetic` (decoloración UV y rayaduras).
  - Métodos `generateMockAiAnalysisReport` y `resolveMockReport` con inyección de latencia y actualización de telemetría.
- **Suite de Pruebas:** `src/services/aiMockService.test.ts` (4 pruebas unitarias).

#### Commit 134 — Componente UI Switch / Toggle de Modo Demo
- **Archivo Creado:** `src/components/ui/DemoModeToggle.tsx`
  - Switch interactivo accesible con soporte para variante compacta de cabecera (`compact=true`) y modo tarjeta completa (`compact=false`).
  - Badges visuales de estado: "🎓 DEMO ACTIVO" vs "⚡ API REAL".
  - Sincronización reactiva mediante suscripción de estado y helper puro `toggleDemoMode`.
  - Design Tokens estrictos (`Colors`, `Radius`, `Spacing`, `Typography`).
- **Suite de Pruebas:** `src/components/ui/DemoModeToggle.test.tsx` (5 pruebas unitarias).

#### Commit 135 — Inyector de Latencia y Simulación de Fallos de Red
- **Archivo Modificado:** `src/services/analysisWorkflow.ts`
  - Integración condicional en `performAnalysisAction`: cuando el modo demo está activo, intercepta la solicitud hacia el mock resolver, inyecta latencia configurada y simula fallos de cuota (HTTP 429), fallos de servidor (HTTP 500) o desconexión offline total.
- **Suite de Pruebas Modificada:** `src/services/analysisWorkflow.test.ts` (23 pruebas unitarias, incluyendo 4 nuevas pruebas de inyección y simulación).

#### Commit 136 — Tarjeta Informativa de Arquitectura RLS y Edge Functions
- **Archivo Creado:** `src/components/ui/ArchitectureInfoCard.tsx`
  - Tarjeta técnica expositiva con los 5 pilares arquitectónicos de VisualTrace para evaluación ante jurado (PostgreSQL 15 RLS, Storage Privado, Edge Function Deno, Gemini Vision e Inferencia, Circuit Breaker).
  - Sección colapsable con accesibilidad nativa (`accessibilityRole="button"`, `aria-expanded`).
- **Suite de Pruebas:** `src/components/ui/ArchitectureInfoCard.test.tsx` (4 pruebas unitarias).

#### Commit 137 — Integración de Controles Demo en Pantalla Principal
- **Archivo Modificado:** `src/app/home.tsx`
  - Incorporación de `DemoModeToggle` compacto en la barra superior (`topBarActions`).
  - Banner informativo persistente `home-demo-active-banner` desplegado cuando el modo de sustentación se encuentra activo.

#### Commit 138 — Integración de Badges Demo en Pantalla de Resultados
- **Archivo Modificado:** `src/app/comparison-result.tsx`
  - Inserción de la tarjeta `ArchitectureInfoCard` (`result-architecture-info-card`) y del distintivo contextual `demo-mode-badge` para exponer al jurado la arquitectura activa y las respuestas simuladas.

#### Commit 139 — Extensión del Servicio Offline y Fallback
- **Archivo Creado:** `src/services/aiOfflineService.ts`
  - Almacenamiento y recuperación en caché offline de reportes de análisis (`cacheOfflineAnalysisReport`, `getOfflineAnalysisReport`, `hasOfflineReport`, `clearOfflineAnalysisCache`).
  - Generación idempotente de fallback de emergencia con `resolveOfflineFallback`.
- **Suite de Pruebas:** `src/services/aiOfflineService.test.ts` (5 pruebas unitarias).

#### Commit 140 — Suite de Pruebas Automatizadas del Flujo Demo
- **Archivo Creado:** `src/integration/demoWorkflow.test.ts`
  - 4 pruebas de integración que comprueban aislamiento total del flujo simulado sin llamadas a backend real, alternancia dinámica de escenarios y restablecimiento limpio del enrutamiento de producción.

#### Commit 141 — Banner de Resiliencia de Red en Vivo
- **Archivo Creado:** `src/components/ui/NetworkResilienceBanner.tsx`
  - Componente accesible (`accessibilityRole="alert"`) que informa al jurado sobre inestabilidad de red y permite conmutar al modo demo con un solo toque o reintentar conexión.
- **Suite de Pruebas:** `src/components/ui/NetworkResilienceBanner.test.tsx` (4 pruebas unitarias).

#### Commit 142 — Panel de Inyección de Errores para Desarrollo
- **Archivo Creado:** `src/components/ui/DevErrorInjectionPanel.tsx`
  - Panel interactivo para sustentación que permite conmutar en vivo: condiciones de red (200 OK, Red lenta, Cuota 429, Servidor 500, Offline), latencias (0ms, 500ms, 1500ms, 3000ms), escenarios de IA y restablecimiento de valores.
- **Suite de Pruebas:** `src/components/ui/DevErrorInjectionPanel.test.tsx` (4 pruebas unitarias).

#### Commit 143 — Integración del Panel Dev en Ajustes
- **Archivo Modificado:** `src/app/home.tsx`
  - Botón de acceso directo (`open-dev-settings-button`) y diálogo modal accesible (`dev-settings-modal`) para calibrar parámetros de sustentación e inyectar errores en tiempo real desde la pantalla de inicio.

#### Commit 144 — Pruebas End-to-End de Escenarios de Sustentación
- **Archivo Creado:** `src/integration/sustentationScenarios.test.ts`
  - 5 pruebas E2E validando:
    1. Demostración exitosa con análisis visual estructurado y severidad calculada.
    2. Demostración de manejo defensivo de cuotas (HTTP 429).
    3. Resiliencia ante caída imprevista de red con recuperación offline.
    4. Recuperación tras fallo de servidor 500.
    5. Salvaguardas y contratos de UI en `home.tsx` y `comparison-result.tsx`.

---

## Micro-Fase de Refinamiento, Resiliencia y Accesibilidad (Commits 145 al 159 — Progreso: 159/200)

### Commit 145 — Optimización de Animación de Pulso con Driver Nativo
- **Archivo Creado/Modificado:** `src/components/ai/AiAnalysisLoadingSkeleton.tsx`
  - Optimización de la animación de pulso con `useNativeDriver: true` en `Animated.loop` y `Animated.sequence` para máximo rendimiento y fluidez visual a 60 FPS en el hilo nativo de UI.
- **Mensaje de Commit:** `style(ai): optimize loading skeleton pulse animation with native driver`

### Commit 146 — Suite de Pruebas Unitarias del Skeleton de Carga
- **Archivo Creado:** `src/components/ai/__tests__/AiAnalysisLoadingSkeleton.test.tsx`
  - Suite de pruebas unitarias verificando renderizado inicial, visibilidad del skeleton, contador de etapas, roles de accesibilidad (`role="progressbar"`) y transiciones controladas de etapas.
- **Mensaje de Commit:** `test(ai): add unit tests for loading skeleton component`

### Commit 147 — Descarte Temporal en Banner de Alerta de Cuota
- **Archivo Creado/Modificado:** `src/components/ai/AiQuotaAlertBanner.tsx`
  - Incorporación de estado local `isDismissed`, prop controlada y botón táctil accesible de cierre rápido (`ai-quota-dismiss-button`) para permitir al usuario ocultar temporalmente la alerta de cuota.
- **Mensaje de Commit:** `feat(ai): add temporary dismiss interaction to quota alert banner`

### Commit 148 — Pruebas Unitarias de Acción de Descarte en Banner de Cuota
- **Archivo Creado:** `src/components/ai/__tests__/AiQuotaAlertBanner.test.tsx`
  - Pruebas unitarias que certifican la renderización correcta, visibilidad condicional según `isDismissed` y mapeo exhaustivo de alcances de cuota.
- **Mensaje de Commit:** `test(ai): verify dismiss action behavior in quota alert banner`

### Commit 149 — Helper Puro de Formateo de Errores de Cuota
- **Archivo Creado:** `src/utils/formatAiQuotaErrorMessage.ts`
  - Función utilitaria pura `formatAiQuotaErrorMessage` y metadata enriquecida `getFormattedAiQuotaDetails` traduciendo códigos de error (`global_minute`, `user_day`, `comparison_day`, `provider_quota_exceeded`, `global_day`) en mensajes tranquilizadores y educativos para el usuario.
- **Mensaje de Commit:** `feat(utils): create pure helper for AI quota error message formatting`

### Commit 150 — Pruebas Unitarias del Formateador de Errores de Cuota
- **Archivo Creado:** `src/utils/__tests__/formatAiQuotaErrorMessage.test.ts`
  - 6 pruebas unitarias exhaustivas con cobertura para límites por minuto, límites diarios, saturación de Gemini Flash y caídas a fallbacks seguros.
- **Mensaje de Commit:** `test(utils): add unit tests for AI error message formatter`

### Commit 151 — Integración de Mensajes Dinámicos en Modal de Cuota
- **Archivo Creado/Modificado:** `src/components/ai/AiQuotaLimitExceededModal.tsx`
  - Integración del helper `formatAiQuotaErrorMessage(scope)` para renderizar dinámicamente descripciones contextuales según el alcance de error devuelto por el backend.
- **Mensaje de Commit:** `refactor(ai): integrate dynamic error message formatting into quota modal`

### Commit 152 — Retroalimentación Háptica al Presentar Modal de Cuota
- **Archivo Modificado:** `src/components/ai/AiQuotaLimitExceededModal.tsx`
  - Invocación segura y tolerante de `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` con la librería oficial `expo-haptics` al activarse la visibilidad del modal.
- **Mensaje de Commit:** `feat(ai): add haptic warning feedback on quota limit modal presentation`

### Commit 153 — Componente de Cuenta Regresiva para Tiempos de Espera
- **Archivo Creado:** `src/components/ai/AiRetryCountdownTimer.tsx`
  - Componente accesible (`role="timer"`) que calcula y renderiza en vivo una cuenta regresiva a partir de `retryAfterSeconds`, con formato de tiempo `mm:ss` y estado de finalización.
- **Mensaje de Commit:** `feat(ai): create countdown timer component for rate limit wait times`

### Commit 154 — Pruebas Unitarias del Temporizador Regresivo
- **Archivo Creado:** `src/components/ai/__tests__/AiRetryCountdownTimer.test.tsx`
  - Validación con temporizadores simulados (`vi.useFakeTimers()`) del formateo de segundos, decremento en intervalos de 1000ms y notificación al completar la espera.
- **Mensaje de Commit:** `test(ai): add tests for retry countdown timer logic and completion`

### Commit 155 — Incrustación Condicional del Temporizador en Modal de Cuota
- **Archivo Modificado:** `src/components/ai/AiQuotaLimitExceededModal.tsx`
  - Renderizado condicional de `AiRetryCountdownTimer` (`modal-retry-countdown-timer`) cuando `retryAfterSeconds` es provisto en las propiedades del modal.
- **Mensaje de Commit:** `feat(ai): embed retry countdown timer inside quota limit modal`

### Commit 156 — Aislamiento en Producción del Panel de Inyección de Errores
- **Archivo Creado/Modificado:** `src/components/dev/DevErrorInjectionPanel.tsx`
  - Envoltorio de seguridad que evalúa `__DEV__` y retorna `null` automáticamente en compilaciones de producción, previniendo fuga de controles de depuración al usuario final.
- **Mensaje de Commit:** `refactor(dev): enforce conditional null rendering for error injection panel in production`

### Commit 157 — Pruebas de Aislamiento del Panel Dev en Modo Producción
- **Archivo Creado:** `src/components/dev/__tests__/DevErrorInjectionPanel.test.tsx`
  - Pruebas unitarias que certifican que el panel renderiza normalmente cuando `__DEV__ === true` y retorna vacío sin nodos DOM cuando `__DEV__ === false`.
- **Mensaje de Commit:** `test(dev): verify error injection panel isolation in production mode`

### Commit 158 — Accesibilidad y Etiquetas de Lector de Pantalla en Selector de Imágenes
- **Archivo Creado:** `src/components/comparison/ImagePickerModal.tsx` y su suite `src/components/comparison/__tests__/ImagePickerModal.test.tsx`
  - Diálogo modal con atributos rigurosos de accesibilidad: `accessibilityRole="button"`, `accessibilityLabel` descriptivo y `accessibilityHint` contextual para las opciones de cámara, galería y cancelación.
- **Mensaje de Commit:** `accessibility(ui): improve screen reader labels in image selection modal`

### Commit 159 — Consolidación de Contexto y Contador Global
- **Archivo Modificado:** `PROJECT_CONTEXT.md`
  - Actualización del estado general del proyecto registrando los 15 commits atómicos (145 al 159) y alcanzando 159/200 commits.
- **Mensaje de Commit:** `docs(project): update project context and total commit count to 159`

---

### Estado Global del Proyecto tras la Micro-Fase (Commit 159 / 200)
- **Progreso de Commits:** 159 de 200 commits completados (79.5% hacia la meta de 200).
- **Suites de Pruebas Automatizadas:** 58 suites ejecutadas y superadas al 100% en Vitest (441 pruebas totales aprobadas).
- **Tipado TypeScript:** 0 errores de compilación (`npx tsc --noEmit` exit code 0).
- **Linter ESLint:** 0 errores y 0 advertencias (`npx eslint .` exit code 0).
- **Arquitectura y Calidad:** Módulo de IA, resiliencia offline, retroalimentación háptica, panel dev aislado y accesibilidad completada.