# VisualTrace

VisualTrace es una aplicación móvil desarrollada para Android que permite registrar y comparar el estado de un objeto, espacio o superficie mediante fotografías tomadas en dos momentos diferentes.

El proyecto busca facilitar la identificación de cambios visibles entre una imagen inicial y una final. Para ello, integra inteligencia artificial con Google Gemini, que genera un informe descriptivo de las diferencias encontradas.

La aplicación también permite administrar un historial de comparaciones, consultar informes anteriores y exportar los resultados para su posterior revisión.

## Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Creación y administración de comparaciones.
- Captura o selección de fotografías desde el dispositivo.
- Comparación de imágenes de estado inicial y final.
- Análisis visual asistido por inteligencia artificial.
- Generación de informes con resúmenes, diferencias y observaciones.
- Historial de comparaciones asociado a cada usuario.
- Consulta, eliminación y nuevo análisis de comparaciones.
- Vista previa, exportación y uso compartido de informes.
- Interfaz disponible en español e inglés.
- Compatibilidad con modo claro y oscuro.
- Manejo de errores de conexión y disponibilidad del servicio de IA.

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
| --- | --- |
| React Native | Desarrollo de la aplicación móvil |
| Expo SDK 58 | Herramientas de desarrollo y compilación |
| TypeScript | Programación y tipado del código |
| Expo Router | Navegación entre pantallas |
| Supabase Auth | Registro, autenticación y sesiones |
| PostgreSQL | Almacenamiento de información |
| Supabase Storage | Almacenamiento privado de fotografías |
| Supabase Edge Functions | Procesamiento de solicitudes de análisis |
| Google Gemini | Análisis visual mediante inteligencia artificial |
| AsyncStorage | Persistencia de preferencias y sesión |
| i18next | Internacionalización de la interfaz |
| Vitest | Pruebas automatizadas |
| ESLint | Revisión y calidad del código |
| GitHub Actions | Ejecución automática de verificaciones |
| EAS Build | Generación del instalador Android |

## Funcionamiento de la aplicación

El proceso de comparación se desarrolla de la siguiente manera:

1. El usuario crea una cuenta o inicia sesión.
2. Desde la pantalla principal puede consultar sus comparaciones o comenzar una nueva.
3. Para registrar una comparación, introduce un nombre y selecciona la fotografía del estado inicial.
4. Posteriormente, agrega la fotografía correspondiente al estado final.
5. La aplicación almacena las imágenes y permite solicitar su análisis.
6. La solicitud se procesa mediante una Edge Function de Supabase, que se comunica con Google Gemini.
7. Gemini analiza las fotografías y genera un informe sobre las diferencias visibles.
8. El resultado puede consultarse desde la aplicación y exportarse para su revisión.

El análisis está orientado a describir los cambios que pueden observarse en las imágenes. Los resultados pueden verse afectados por factores como la iluminación, el encuadre o la calidad de las fotografías, por lo que deben ser revisados por el usuario.

## Integración de inteligencia artificial

VisualTrace utiliza Google Gemini para analizar las fotografías de una comparación.

La integración se realiza a través de una Edge Function de Supabase denominada `analyze-comparison`. De esta manera, la aplicación móvil no necesita comunicarse directamente con Gemini ni almacenar la clave privada del proveedor.

El procesamiento incluye la validación de la solicitud, la recuperación de las imágenes almacenadas, el envío de la información al modelo y la validación del informe generado.

La aplicación también contempla situaciones en las que el servicio de inteligencia artificial no está disponible o ha alcanzado sus límites de uso. En estos casos, informa al usuario y permite intentar nuevamente el análisis.

La disponibilidad de esta funcionalidad depende de la conexión a internet, las cuotas configuradas y el estado del servicio de Gemini.

## Base de datos y almacenamiento

La información de VisualTrace se administra mediante Supabase.

PostgreSQL permite almacenar los registros de las comparaciones y los informes de análisis. Supabase Auth se encarga de la autenticación, mientras que Supabase Storage almacena las fotografías en un bucket privado.

El proyecto utiliza políticas de seguridad a nivel de fila (RLS) para restringir el acceso a la información de cada usuario.

Las migraciones de la base de datos y el código de las funciones del backend se encuentran versionados dentro de la carpeta `supabase/`.

## Estructura del proyecto

```text
visual-trace-mobile/
├── .github/
│   └── workflows/
├── assets/
│   ├── animations/
│   └── images/
├── docs/
├── plugins/
├── scripts/
├── src/
│   ├── app/
│   ├── components/
│   ├── constants/
│   ├── context/
│   ├── contracts/
│   ├── hooks/
│   ├── i18n/
│   ├── integration/
│   ├── lib/
│   ├── services/
│   ├── storage/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── tests/
├── app.config.js
├── app.json
├── eas.json
├── package.json
└── README.md
```

La carpeta `src/` contiene la aplicación, sus pantallas, componentes y servicios. La carpeta `supabase/` reúne los elementos del backend, mientras que `.github/workflows/` contiene la configuración de las verificaciones automáticas.

## Instalación para desarrollo

Para ejecutar el proyecto localmente es necesario contar con Node.js, npm y un entorno compatible con Expo.

Clonar el repositorio:

```bash
git clone https://github.com/luis-sdiaz/visual-trace-mobile.git
```

Ingresar al directorio:

```bash
cd visual-trace-mobile
```

Instalar las dependencias:

```bash
npm ci
```

Crear un archivo `.env.local` con las variables públicas de conexión a Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=URL_DEL_PROYECTO
EXPO_PUBLIC_SUPABASE_KEY=CLAVE_PUBLICABLE
```

Iniciar el servidor de desarrollo:

```bash
npx expo start
```

Para utilizar todas las funcionalidades es necesario disponer de un proyecto Supabase configurado con las tablas, políticas de seguridad, almacenamiento y funciones correspondientes.

La clave privada de Gemini debe configurarse en los secretos de Supabase y no incluirse en el código de la aplicación móvil.

## Pruebas y validación

Durante el desarrollo se implementaron pruebas automatizadas para comprobar diferentes partes de la aplicación, incluyendo servicios, componentes, validaciones y flujos de integración.

Los comandos principales de verificación son:

```bash
npx tsc --noEmit
npm test
npm run lint
```

Estas comprobaciones también forman parte del flujo de integración continua configurado mediante GitHub Actions.

Además de las pruebas automatizadas, se realizaron verificaciones funcionales en dispositivos físicos utilizando Expo Go y una compilación Android independiente.

## Aplicación Android

VisualTrace cuenta con una versión demostrativa para Android, generada mediante Expo Application Services (EAS Build).

La versión publicada es **VisualTrace v1.0.0**.

El APK disponible fue compilado para dispositivos Android compatibles con la arquitectura `arm64-v8a` y se validó mediante su instalación en un Motorola Moto G04s.

El instalador puede descargarse desde la sección de lanzamientos del repositorio:

**[Descargar VisualTrace para Android](https://github.com/luis-sdiaz/visual-trace-mobile/releases/tag/v1.0.0)**

Para generar una compilación de prueba con la configuración utilizada en el proyecto:

```bash
eas build --platform android --profile preview-moto-g04s
```

Este comando requiere acceso a un proyecto EAS configurado y a sus variables de entorno correspondientes.

La versión disponible está destinada a demostración y evaluación académica. Algunas funciones necesitan una conexión a internet y servicios externos activos.

## Consideraciones

VisualTrace es una herramienta de apoyo para la comparación visual de fotografías. El análisis generado por inteligencia artificial no sustituye la revisión humana ni garantiza la detección de todas las diferencias.

La precisión de los resultados depende de las imágenes utilizadas y de las capacidades del modelo de inteligencia artificial.

El proyecto fue desarrollado con fines académicos, aplicando conceptos de desarrollo móvil, diseño de interfaces, bases de datos, servicios en la nube, seguridad e integración de inteligencia artificial.

## Autor

**Luis Sebastian Diaz**

Proyecto académico de desarrollo de aplicaciones móviles.

Repositorio: https://github.com/luis-sdiaz/visual-trace-mobile
