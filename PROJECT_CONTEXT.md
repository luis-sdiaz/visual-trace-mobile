# PROJECT CONTEXT — VisualTrace Mobile

## 1. Resumen del Proyecto

**VisualTrace** es una aplicación móvil multiplataforma orientada a la documentación y comparación visual rigurosa del estado de espacios u objetos mediante pares fotográficos temporales ("ANTES" / `initial` y "DESPUÉS" / `final`). Su funcionalidad core radica en la captura y persistencia segura de evidencia visual en almacenamiento privado en la nube (aislado por usuario), combinada con un motor de análisis comparativo asistido por IA (Google Gemini) que identifica, categoriza y resume discrepancias físicas bajo un esquema estructurado estricto y de carácter consultivo.

---

## 2. Tech Stack

### Entorno Móvil & Runtime
- **Framework Principal:** [React Native](https://reactnative.dev/) `0.86.3` sobre [Expo SDK 57](https://expo.dev/) (`expo ~57.0.30`).
- **Arquitectura React:** [React 19](https://react.dev/) `19.2.3` con soporte experimental para React Compiler activado (`reactCompiler: true`).
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
- **Plataforma BaaS:** [Supabase](https://supabase.com/) (`@supabase/supabase-js` `^2.117.2`).
  - **Supabase Auth:** Autenticación por correo y contraseña, control de sesión persistente y revocación.
  - **Base de Datos (PostgreSQL 15+):** Tablas relacionales con Row Level Security (RLS) mandatorio, políticas multi-tenant y procedimientos almacenados transaccionales (`security definer`).
  - **Supabase Storage:** Bucket privado `comparison-images` protegido por políticas RLS jerárquicas e idempotentes, límite de archivo sincronizado a 10 MiB (10,485,760 bytes), límite de par a 20 MiB (20,971,520 bytes) y acceso mediante URLs prefirmadas de tiempo limitado (TTL corto por defecto de 300 s).
  - **Edge Functions (Deno Runtime):** Función `analyze-comparison` desplegada activamente en producción con verificación JWT (`verify_jwt = true`), descarga y validación binaria de imágenes, deduplicación de ejecuciones y control estricto de cuotas transaccionales.

### Inteligencia Artificial
- **Motor de Inferencia:** Google Gemini REST API (modelo de referencia: `gemini-2.5-flash`), ejecutado de forma privada desde Supabase Edge Functions con secreto `GEMINI_API_KEY` aprovisionado en la nube.
- **Contrato de Integración:** Especificación `1.0` con salida estructurada mandatoria mediante JSON Schema (`GEMINI_ANALYSIS_RESPONSE_SCHEMA`). La invocación se realiza exclusivamente desde el backend protegido; nunca se expone la API Key ni se procesa directamente en el cliente.

### Persistencia Local
- **Motor de Caché y Borradores:** `@react-native-async-storage/async-storage` `2.2.0` (persistencia del token de sesión Supabase y cola transaccional para borradores locales aislados por identificador de usuario).

### Calidad, Análisis Estático & Testing
- **Test Runner:** [Vitest](https://vitest.dev/) `5.0.4` (199 pruebas unitarias y de integración que validan contratos, utilidades, servicios y Edge Functions).
- **Linter:** [ESLint](https://eslint.org/) `^9.39.5` con configuración `eslint-config-expo`.
- **Pruebas de Base de Datos:** Scripts SQL transaccionales (`ROLLBACK`) para verificación de RLS y cuotas en PostgreSQL.

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
   - **Defensive Quota Reservation:** Sistema transaccional en PostgreSQL (`ai_usage_limits`) que reserva la cuota previa a la llamada al LLM y maneja fallos inciertos de manera conservadora.

### Manejo de Estado Global y Local

La aplicación evita dependencias de librerías externas de estado (como Redux o Zustand), aprovechando la composición modular de **React Context API** combinada con persistencia asíncrona serializada:

- **`AuthContext` (`src/context/AuthContext.tsx`):**
  - Administra el ciclo de vida de la sesión activa (`session`, `user`, `isLoading`).
  - Sincroniza en tiempo real los eventos de autenticación emitidos por Supabase mediante `observeAuthSession`.
  - Gobierna el enrutamiento protegido mediante la primitiva declarativa `<Stack.Protected guard={...} />` de Expo Router, bloqueando rutas privadas para invitados y viceversa.

- **`ComparisonContext` (`src/context/ComparisonContext.tsx`):**
  - Controla el estado transaccional del borrador en curso: metadatos (`comparisonId`, `name`), URIs locales (`initialImageUri`, `finalImageUri`), rutas remotas (`initialImagePath`, `finalImagePath`) y banderas de sincronización (`isDirty`, `isTransient`).
  - Implementa una cola de persistencia serializada hacia AsyncStorage (`persistenceQueueRef`), garantizando aislamiento multiusuario (`@visualtrace/comparison-draft:<userId>`) y evitando sobreescrituras por desincronización en hidratación.

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
│   ├── migrations/             # Migraciones SQL versionadas (tablas, RLS, funciones PL/pgSQL)
│   └── tests/                  # Pruebas de integración sobre PostgreSQL y Storage RLS
├── .env.local                  # Variables de entorno públicas del cliente (no versionado)
├── app.json                    # Manifiesto de configuración de Expo
├── eslint.config.js            # Configuración de ESLint 9
├── package.json                # Dependencias del proyecto y scripts de ejecución
├── tsconfig.json               # Configuración del compilador TypeScript con path mapping
└── vitest.config.mts           # Configuración del motor de pruebas Vitest
```

---

## 5. Estado Actual

### Fase de Desarrollo
**Fase de Maduración Funcional y Preparación para Despliegue Remoto — Fase 1 (Bloque C) — Total Commits: 93.**

### Componentes Terminados y Validados
- **Autenticación Completa:** Flujos de registro, inicio de sesión, cierre de sesión, persistencia de sesión con AsyncStorage y navegación protegida reactiva en base a credenciales válidas.
- **Flujo Guiado de Comparación (Wizard):** Creación de entidad de comparación (`draft`), asignación de título, captura y validación fotográfica de estado inicial y final con subida atómica a Supabase Storage y transición a estado `ready`.
- **Navegación Contextual y Resiliencia en Historial (Resuelto en Commit 90):** Solución definitiva al ciclo de retroceso forzado en comparaciones abiertas desde el historial (`home` -> `comparison-result`). Se implementó propagación de parámetro contextual (`source: 'history'`), intercepción del botón físico en Android con `BackHandler`, configuración de `headerLeft` en `<Stack.Screen>` y retorno directo a `home` mediante `router.dismissTo('/home')`, preservando el flujo secuencial original del wizard (`router.back()`) para comparaciones en proceso de creación.
- **Almacenamiento Seguro Multi-inquilino e Idempotencia (Fase 1 - Bloque C, Commit 91):**
  - Bucket privado `comparison-images` protegido por políticas RLS que verifican propiedad estricta por `user_id`.
  - Migración SQL (`202610150001_version_private_comparison_storage.sql`) blindada e idempotente para evitar colisiones contra buckets preexistentes en producción mediante `INSERT INTO storage.buckets ... ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit`.
  - Sentencias `CREATE POLICY` blindadas en bloques `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`.
  - Límites de tamaño sincronizados con la infraestructura remota de producción: **10 MiB (10,485,760 bytes)** por imagen individual y **20 MiB (20,971,520 bytes)** por par de fotografías (`supabase/functions/_shared/comparisonImages.ts` y contratos cliente).
- **Backend de IA Aprovisionado y Desplegado en Producción (Fase 1 - Bloque C, Commit 92):**
  - Infraestructura del backend de IA 100% aprovisionada en la nube en Supabase Remote: tablas de reportes de análisis (`ai_analysis_reports`), mecanismos de control de uso (`ai_usage_limits`), procedimientos PL/pgSQL transaccionales de reserva/consumo y RLS activo.
  - Edge Function `analyze-comparison` desplegada activamente en producción en Supabase con verificación estricta de token JWT (`verify_jwt = true`).
  - Configuración exitosa del secreto `GEMINI_API_KEY` en el entorno remoto de Supabase, garantizando acceso seguro y aislado al proveedor de IA sin exponer credenciales al bundle móvil.
  - Validación estricta de binarios activa (máximo 10 MiB individual / 20 MiB combinado, comprobación de cabeceras mágicas), verificación del contrato JSON v1.0 y reserva transaccional de cuotas (`AI_GLOBAL_PER_MINUTE`, `AI_GLOBAL_PER_DAY`, `AI_USER_PER_DAY`, `AI_COMPARISON_PER_DAY`).
- **Integración y Refinamiento del Flujo Cliente de IA (Fase 1 - Bloque C, Commit 93):**
  - Robustecimiento de `analysisService.ts` con manejo integral de respuestas de Edge Functions: token JWT de sesión activo, mapeo de códigos de cuota HTTP 429 (`usage_limit_reached` y `provider_quota_exceeded`), indisponibilidad de cuota HTTP 503 (`usage_limits_unavailable` -> `reports_unavailable`), concurrencia HTTP 409 (`analysis_in_progress`) y revocación de sesión HTTP 401.
  - Refinamiento de la presentación visual en `analysisWorkflow.ts` distinguiendo el estado `limited` ("Límite alcanzado").
  - Fortalecimiento de la interfaz en `comparison-result.tsx`: deshabilitación sistemática de botones interactivos (`isAnalyzing`) durante la invocación (botón de análisis, edición de nombres, retroceso nativo y hardware de Android mediante `BackHandler`), renderizado de loaders contextuales y despliegue prominente del informe estructurado o tarjeta de advertencia ante agotamiento de cuotas.
- **Panel Principal (Home):** Paginación por cursores (`keyset pagination`), búsqueda en tiempo real insensible a acentos/caracteres especiales, filtrado por estados (`draft`, `ready`, `analyzed`) y ordenamiento cronológico.
- **Persistencia de Borradores en Cliente:** Soporte para recuperación de sesión y borrador tras interrupción, con aislamiento por usuario y validación de concurrencia.
- **Control de Calidad:**
  - 199 pruebas automatizadas ejecutadas y superadas en Vitest (`21/21` archivos de test pasados).
  - Verificación de tipos TypeScript estricta (`npx tsc --noEmit`) sin advertencias ni errores.
  - Análisis estático con ESLint (`expo lint`) sin observaciones.

### Fase en Construcción / Próximos Pasos Técnicos
- **Pruebas en Dispositivos Físicos y Smoke Test de IA en Vivo:**
  - Validación de hardware en iOS y Android con formatos de cámara nativos (JPEG/PNG/HEIC/HEIF) para confirmar la captura, compresión y subida hacia Supabase Storage bajo el nuevo límite de 10 MiB.
  - Ejecución del primer *smoke test* de inferencia de extremo a extremo consumiendo la Edge Function `analyze-comparison` desplegada en Supabase remoto con dos imágenes reales para auditar latencias, consumo de cuota y renderizado del informe estructurado.
- **Monitoreo y Observabilidad en Producción:**
  - Supervisión de los contadores de cuota en PostgreSQL y trazabilidad de respuestas o eventuales rechazos del proveedor Gemini.
