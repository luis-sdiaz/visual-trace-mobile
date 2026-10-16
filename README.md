# VisualTrace

VisualTrace es una aplicación móvil para registrar el estado de un espacio u objeto con una fotografía **ANTES** y otra **DESPUÉS**. Conserva la evidencia en un backend privado y prepara un análisis visual asistido por Gemini. El resultado de IA es orientativo: la revisión y la decisión final siempre corresponden al usuario.

## Estado real

El repositorio contiene la aplicación móvil, la persistencia en Supabase, las políticas versionadas del Storage privado, el contrato de análisis, la Edge Function `analyze-comparison` y sus pruebas.

La integración de IA **no está en producción todavía**:

- Las migraciones de IA y Storage incluidas en este repositorio no se han aplicado a Supabase remoto.
- La Edge Function no se ha desplegado en Supabase remoto.
- No se ha configurado ni consumido una clave real de Gemini.
- Las validaciones de PostgreSQL, RLS y Storage se han realizado únicamente en Supabase local.

## Flujo funcional

1. El usuario se registra o inicia sesión mediante Supabase Auth.
2. Crea una comparación y asigna un nombre.
3. Captura o selecciona la fotografía **ANTES** (`initial`).
4. Captura o selecciona la fotografía **DESPUÉS** (`final`).
5. La aplicación valida y sube cada archivo al bucket privado `comparison-images`.
6. La comparación pasa de `draft` a `ready` cuando dispone de ambas rutas.
7. La pantalla de resultado recupera las fotografías mediante enlaces firmados de corta duración.
8. Cuando el backend de IA esté desplegado, la aplicación podrá solicitar el análisis y mostrar el informe persistido.

Las sustituciones de fotografías usan nombres versionados y control optimista para evitar sobrescribir cambios concurrentes. Una comparación ya analizada no admite edición de imágenes.

## Arquitectura

```text
Expo / React Native
  ├─ Supabase Auth
  ├─ PostgreSQL + RLS
  ├─ Storage privado: comparison-images
  └─ Edge Function: analyze-comparison
       ├─ autentica y comprueba propiedad
       ├─ descarga y valida ambas imágenes
       ├─ reserva cuota de forma transaccional
       ├─ invoca Gemini desde el backend
       └─ valida y persiste el informe
```

Responsabilidades principales:

```text
src/app/                         pantallas y navegación
src/context/                     sesión y borrador de comparación
src/services/                    comparaciones, imágenes y análisis
src/contracts/                   límites y contrato compartido
supabase/functions/              Edge Function y módulos compartidos
supabase/migrations/             esquema, funciones y políticas versionadas
supabase/tests/                  integración PostgreSQL, RLS y Storage
.github/workflows/quality.yml    validación continua
```

## Stack tecnológico

| Componente | Tecnología |
| --- | --- |
| Aplicación | Expo SDK 57, React Native 0.86, React 19 |
| Lenguaje | TypeScript estricto |
| Navegación | Expo Router |
| Cámara y galería | Expo Image Picker |
| Persistencia local | AsyncStorage |
| Backend | Supabase Auth, PostgreSQL, Storage y Edge Functions |
| IA preparada | Gemini REST API desde una Edge Function |
| Calidad | TypeScript, Vitest, ESLint y GitHub Actions |

## Fotografías privadas

El límite único es **6 MiB por fotografía**: se aplica en el cliente, en el bucket y nuevamente en la Edge Function. Como defensa adicional, la función limita el par a **12 MiB** antes de invocar al proveedor. Los formatos admitidos son JPEG, PNG, WebP, HEIC y HEIF; el backend comprueba extensión, MIME declarado y firma binaria.

La ruta canónica contiene exactamente tres segmentos:

```text
USER_ID/COMPARISON_ID/initial.ext
USER_ID/COMPARISON_ID/final.ext
USER_ID/COMPARISON_ID/initial-VERSION.ext
USER_ID/COMPARISON_ID/final-VERSION.ext
```

El bucket `comparison-images` es privado. Sus políticas RLS versionadas permiten `SELECT`, `INSERT`, `UPDATE` y `DELETE` sólo al usuario autenticado cuyo identificador inicia la ruta y que es propietario de la comparación. La misma política de lectura protege la descarga y la creación de enlaces firmados; la aplicación usa 5 minutos por defecto y acepta entre 60 y 3600 segundos.

## Contrato Gemini

`analyze-comparison` acepta únicamente `POST` autenticado con:

```json
{ "comparisonId": "UUID" }
```

La función no acepta imágenes suministradas directamente por el cliente. Obtiene las rutas guardadas en la comparación, valida propiedad y estructura, descarga los dos objetos privados y los envía en línea al proveedor.

El contrato de respuesta `1.0` exige:

- `hasVisibleChanges` booleano.
- `summary` con un máximo de 500 caracteres.
- Hasta 12 diferencias categorizadas.
- Hasta 8 observaciones y 8 incertidumbres.
- Ninguna propiedad adicional.

La respuesta del proveedor se valida antes de persistirse. Los informes quedan ligados a las rutas exactas de las fotografías; si éstas cambian durante el análisis, el resultado obsoleto se rechaza. Las reservas concurrentes se deduplican y los intentos inciertos se conservan para contabilizar cuota de forma conservadora.

El modelo predeterminado en código es `gemini-2.5-flash`; debe confirmarse su disponibilidad para el proyecto de Google antes de la primera prueba real.

## Límites de consumo

La Edge Function falla de forma cerrada si las cuatro cuotas no están configuradas con enteros seguros. Los máximos admitidos por el código son:

| Variable | Máximo |
| --- | ---: |
| `AI_GLOBAL_PER_MINUTE` | 3 |
| `AI_GLOBAL_PER_DAY` | 10 |
| `AI_USER_PER_DAY` | 6 |
| `AI_COMPARISON_PER_DAY` | 3 |

Se puede elegir un valor menor, pero nunca cero, un valor no entero o uno superior al máximo.

## Configuración

La aplicación móvil requiere un archivo local no versionado `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_KEY=...
```

Sólo la URL y la clave pública/publicable pertenecen al cliente. No deben incluirse allí claves administrativas ni la clave de Gemini.

La Edge Function requiere secretos del entorno de Supabase:

```text
GEMINI_API_KEY
GEMINI_MODEL                 opcional; usa el modelo predeterminado si se omite
AI_GLOBAL_PER_MINUTE
AI_GLOBAL_PER_DAY
AI_USER_PER_DAY
AI_COMPARISON_PER_DAY
```

Supabase proporciona a la función `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Ningún valor secreto debe guardarse en Git, imprimirse en logs ni exponerse al bundle móvil.

## Instalación y desarrollo

El entorno de referencia de CI usa Node.js 22 y npm; el desarrollo móvil requiere además un entorno Expo compatible.

```bash
git clone https://github.com/luis-sdiaz/visual-trace-mobile.git
cd visual-trace-mobile
npm ci
npx expo start
```

## Pruebas reproducibles

La validación estándar, ejecutada también por GitHub Actions, no necesita Gemini ni Supabase remoto:

```bash
npx tsc --noEmit
npm test
npm run lint
```

Las pruebas de `supabase/tests` son integraciones explícitas y requieren un Supabase **local** con el esquema y las migraciones aplicados:

```bash
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/ai_analysis_reports_rls.test.sql
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/ai_analysis_usage_retries.test.sql
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/comparison_storage_rls.test.sql
node supabase/tests/comparison_storage_api.integration.mjs
```

La prueba de API de Storage lee `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` exclusivamente del entorno local. No debe apuntarse a un proyecto remoto. Las pruebas SQL usan transacciones con `ROLLBACK`.

## Preparación del despliegue remoto

Antes de modificar Supabase remoto:

1. Confirmar el proyecto y obtener un respaldo recuperable.
2. Auditar la tabla remota de historial de migraciones y comparar esquema, funciones, grants, RLS, políticas y bucket con el repositorio.
3. Verificar que ya existen `public.comparisons`, sus columnas esperadas, su RLS y la relación correcta con `auth.users`; estas migraciones dependen de ese esquema base.
4. Revisar objetos creados manualmente y resolver conflictos sin marcar migraciones como aplicadas a ciegas.
5. Probar en un entorno remoto no productivo y revisar el plan/diff antes de aplicar cambios.

Orden de las migraciones incluidas:

```text
202610140001_create_ai_analysis_reports.sql
202610140002_create_ai_usage_limits.sql
202610140003_allow_safe_ai_analysis_retries.sql
202610140004_fix_ai_analysis_reports_rls.sql
202610150001_version_private_comparison_storage.sql
```

Después de validar las migraciones:

1. Configurar las variables de cuota y `GEMINI_API_KEY` como secretos de la función.
2. Confirmar `verify_jwt = true` para `analyze-comparison`.
3. Desplegar la función sin incluir secretos en el comando ni en el repositorio.
4. Verificar Auth, CRUD privado, aislamiento entre usuarios y enlaces firmados.
5. Ejecutar una única prueba controlada con dos imágenes pequeñas, observar cuota, latencia y persistencia, y confirmar que no se registran imágenes, tokens ni respuestas sensibles.
6. Mantener desactivada cualquier ampliación de cuota o facturación hasta revisar el resultado y los costes.

## Pendientes para Gemini real

- Reconciliar y aplicar las migraciones en un entorno remoto seguro.
- Configurar secretos y cuotas conservadoras.
- Desplegar `analyze-comparison` y confirmar la disponibilidad del modelo elegido.
- Ejecutar pruebas remotas de autenticación, RLS, Storage y errores del proveedor.
- Realizar el primer smoke test real y revisar observabilidad, coste y política de retención.
- Validar el flujo completo en dispositivos físicos y con fotografías HEIC/HEIF reales.

## Seguridad

- Auth y RLS son la frontera de acceso; la clave de servicio sólo existe en la Edge Function.
- El cliente nunca recibe `GEMINI_API_KEY` ni credenciales administrativas.
- El bucket no es público y las URLs firmadas caducan.
- El backend valida tamaño, ruta, tipo real y contrato de salida, aunque el cliente ya los haya validado.
- La IA describe cambios visibles; no determina causas, responsabilidades ni decisiones definitivas.

## Autor

Luis Sebastian Diaz

**VisualTrace — Registra. Compara. Revisa lo que cambió.**
