# VisualTrace

VisualTrace es una aplicación móvil desarrollada para facilitar el registro y la comparación visual del estado de espacios, objetos o elementos antes y después de un periodo de uso.

La aplicación permite registrar una fotografía inicial y una fotografía final para posteriormente comparar ambos estados. El proyecto está pensado para incorporar inteligencia artificial como apoyo en la identificación de posibles cambios visibles, como manchas, golpes, rayones u otras diferencias entre las imágenes.

> La inteligencia artificial funciona como una herramienta de apoyo visual. La revisión y decisión final siempre corresponde al usuario.

---

## Objetivo del proyecto

El objetivo principal de VisualTrace es permitir que una persona pueda documentar de manera sencilla el estado inicial y final de un espacio u objeto mediante fotografías.

Algunos posibles casos de uso son:

- Entrega y devolución de habitaciones.
- Alquiler de apartamentos.
- Préstamo de equipos.
- Registro de objetos antes y después de ser utilizados.
- Control visual del estado de diferentes elementos.
- Evidencia fotográfica organizada.

VisualTrace busca centralizar este proceso dentro de una aplicación móvil sencilla, clara y fácil de utilizar.

---

## Funcionamiento general

El flujo principal de la aplicación está dividido en tres pasos.

### 1. Información básica

El usuario asigna un nombre a la comparación para identificarla posteriormente.

Ejemplo:

```text
Habitación 101
```

### 2. Estado inicial

El usuario registra la primera fotografía utilizando:

- La cámara del dispositivo.
- Una imagen existente en la galería.

Esta fotografía representa el estado inicial del espacio u objeto.

### 3. Estado final

Posteriormente se registra una segunda fotografía que representa el estado final.

Al terminar, la aplicación presenta ambas imágenes para que puedan ser revisadas y comparadas.

---

## Flujo de navegación

```text
Bienvenida
    │
    ├── Iniciar sesión
    │
    └── Crear cuenta
            │
            ▼
           Home
            │
            ▼
    Nueva comparación
            │
            ▼
     Estado inicial
            │
            ▼
       Estado final
            │
            ▼
  Resultado de comparación
```

La navegación fue diseñada para mantener un flujo sencillo y evitar pasos innecesarios durante el registro de una comparación.

---

## Funcionalidades implementadas

Actualmente VisualTrace cuenta con las siguientes funcionalidades:

- Pantalla de bienvenida.
- Registro de usuarios.
- Inicio de sesión.
- Cierre de sesión.
- Autenticación utilizando Supabase.
- Creación de una nueva comparación.
- Registro del nombre de la comparación.
- Captura de fotografías utilizando la cámara.
- Selección de fotografías desde la galería.
- Registro del estado inicial.
- Registro del estado final.
- Vista previa de las fotografías seleccionadas.
- Pantalla de resultado de comparación.
- Persistencia local de una comparación en progreso.
- Limpieza automática del borrador al iniciar una nueva comparación.
- Navegación entre las diferentes etapas.
- Diseño adaptable para dispositivos móviles.
- Sistema de colores, espaciado, tipografía y bordes reutilizable.
- Componentes visuales reutilizables.

---

## Persistencia del borrador

VisualTrace conserva temporalmente la comparación que se encuentra en progreso.

Esto permite evitar la pérdida de información si la aplicación se recarga accidentalmente mientras el usuario está realizando el proceso.

Se almacenan temporalmente:

```text
Nombre de la comparación
Fotografía inicial
Fotografía final
```

Cuando el usuario selecciona **Crear comparación**, el borrador anterior se limpia para comenzar un nuevo registro.

---

## Tecnologías utilizadas

El proyecto está desarrollado principalmente con:

| Tecnología | Uso |
| --- | --- |
| React Native | Desarrollo de la interfaz móvil |
| Expo | Entorno y herramientas de desarrollo |
| TypeScript | Tipado y desarrollo de la aplicación |
| Expo Router | Navegación entre pantallas |
| Expo Image Picker | Acceso a cámara y galería |
| AsyncStorage | Persistencia local |
| Supabase | Autenticación y backend |
| Supabase Auth | Gestión de usuarios |
| Supabase Database | Base de datos del proyecto |
| Supabase Storage | Almacenamiento de imágenes |
| Ionicons | Iconografía de la interfaz |
| Git | Control de versiones |
| GitHub | Repositorio remoto |

---

## Arquitectura actual

La aplicación organiza el código separando responsabilidades entre pantallas, componentes, configuración, contexto, servicios y almacenamiento.

```text
VisualTrace/
│
├── assets/
│
├── src/
│   │
│   ├── app/
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── home.tsx
│   │   ├── new-comparison.tsx
│   │   ├── initial-state.tsx
│   │   ├── final-state.tsx
│   │   ├── comparison-result.tsx
│   │   └── _layout.tsx
│   │
│   ├── components/
│   │   └── ui/
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── radius.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ComparisonContext.tsx
│   │
│   ├── lib/
│   │   └── supabase.ts
│   │
│   └── storage/
│       └── comparisonStorage.ts
│
├── app.json
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

## Sistema de diseño

VisualTrace utiliza un sistema visual propio para mantener consistencia entre las diferentes pantallas.

### Color principal

```text
#2563EB
```

Este azul representa las acciones principales y la identidad visual de la aplicación.

### Colores semánticos

| Uso | Color |
| --- | --- |
| Principal | `#2563EB` |
| Estado inicial | `#2563EB` |
| Estado final | `#16A34A` |
| Advertencia | `#D97706` |
| Error | `#DC2626` |
| Texto principal | `#0F172A` |
| Texto secundario | `#64748B` |
| Fondo | `#F8FAFC` |
| Superficie | `#FFFFFF` |

El proyecto también utiliza constantes reutilizables para:

- Colores.
- Espaciados.
- Tipografía.
- Bordes redondeados.

Esto facilita mantener una apariencia uniforme durante todo el desarrollo.

---

## Backend con Supabase

VisualTrace utiliza Supabase para gestionar diferentes servicios del backend.

Actualmente se encuentra configurado para trabajar con:

### Autenticación

Supabase Auth permite administrar:

- Registro de usuarios.
- Inicio de sesión.
- Sesiones.
- Cierre de sesión.

### Base de datos

La estructura del backend contempla información relacionada con:

```text
profiles
comparisons
comparison_findings
```

### Storage

También se encuentra preparado un almacenamiento privado para las imágenes asociadas a las comparaciones.

La estructura prevista para las fotografías es:

```text
USER_ID/
└── COMPARISON_ID/
    ├── initial.jpg
    └── final.jpg
```

El acceso a la información se protege utilizando políticas de seguridad mediante Row Level Security (RLS).

---

## Inteligencia artificial

Una de las siguientes etapas del proyecto consiste en integrar un modelo de inteligencia artificial para apoyar la comparación de las fotografías.

El flujo previsto es:

```text
Fotografía inicial
        +
Fotografía final
        │
        ▼
Backend seguro
        │
        ▼
Modelo de IA
        │
        ▼
Posibles diferencias visuales
        │
        ▼
Revisión del usuario
```

La inteligencia artificial podrá indicar posibles diferencias como:

- Rayones.
- Manchas.
- Golpes.
- Cambios visibles.
- Elementos que aparecen o desaparecen.

La IA no determinará responsabilidades ni tomará una decisión definitiva. Su función será señalar posibles cambios para facilitar la revisión humana.

---

## Variables de entorno

Para conectar la aplicación con Supabase se utiliza un archivo local:

```text
.env.local
```

Debe contener:

```env
EXPO_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_KEY=TU_SUPABASE_PUBLISHABLE_KEY
```

Este archivo no debe subirse al repositorio.

Las claves privadas, contraseñas de base de datos y claves administrativas nunca deben almacenarse directamente en la aplicación móvil.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/luis-sdiaz/visual-trace-mobile.git
```

### 2. Entrar al proyecto

```bash
cd visual-trace-mobile
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Crear las variables de entorno

Crear el archivo:

```text
.env.local
```

y configurar las credenciales correspondientes de Supabase.

### 5. Iniciar Expo

```bash
npx expo start
```

Para utilizar un túnel:

```bash
npx expo start --tunnel
```

Después se puede abrir la aplicación utilizando Expo Go desde un dispositivo móvil.

---

## Comandos útiles

Ejecutar el proyecto:

```bash
npx expo start
```

Ejecutar mediante túnel:

```bash
npx expo start --tunnel
```

Validar TypeScript:

```bash
npx tsc --noEmit
```

Revisar la configuración del proyecto Expo:

```bash
npx expo-doctor
```

Revisar compatibilidad de dependencias:

```bash
npx expo install --check
```

---

## Estado actual del proyecto

VisualTrace se encuentra actualmente en etapa de desarrollo.

La primera fase incluye:

- Diseño de la interfaz.
- Sistema de diseño.
- Navegación.
- Autenticación.
- Captura y selección de imágenes.
- Manejo del estado de una comparación.
- Persistencia local.
- Configuración inicial del backend.

Las siguientes etapas estarán orientadas a completar la persistencia de las comparaciones en Supabase y posteriormente integrar el procesamiento mediante inteligencia artificial.

---

## Próximas mejoras

Entre las funcionalidades planeadas se encuentran:

- Guardar comparaciones completas en Supabase.
- Subir las fotografías al almacenamiento privado.
- Mostrar comparaciones recientes en la pantalla principal.
- Integrar el análisis visual mediante inteligencia artificial.
- Mostrar los posibles cambios detectados.
- Permitir confirmar o descartar cada hallazgo.
- Mejorar el historial de comparaciones.
- Incorporar soporte completo para español e inglés.
- Mejorar manejo de errores y estados de carga.
- Continuar realizando pruebas en dispositivos reales.

---

## Validación del proyecto

Durante el desarrollo se utilizan diferentes herramientas para comprobar la estabilidad del proyecto.

Validación de TypeScript:

```bash
npx tsc --noEmit
```

Validación de Expo:

```bash
npx expo-doctor
```

Estado actual:

```text
21/21 checks passed. No issues detected!
```

---

## Seguridad

Para el desarrollo de VisualTrace se tienen en cuenta diferentes medidas de seguridad:

- Las contraseñas son administradas por Supabase Auth.
- No se almacenan contraseñas en texto plano.
- Las tablas utilizan Row Level Security.
- Las imágenes se almacenarán en un bucket privado.
- Cada usuario tendrá acceso únicamente a su propia información.
- Las claves privadas no se incluyen dentro del código del cliente.
- La futura clave utilizada para inteligencia artificial se mantendrá en el backend.

---

## Autor

**Luis Sebastian Diaz**

Proyecto desarrollado como parte del proceso académico de desarrollo y diseño de interfaces de software.

---

## Repositorio

```text
https://github.com/luis-sdiaz/visual-trace-mobile
```

---

## VisualTrace

**Registra. Compara. Revisa lo que cambió.**
