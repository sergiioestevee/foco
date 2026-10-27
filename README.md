<p align="center">
  <img src="assets/foco-icon-dark.png" width="140" alt="Logo de Foco" />
</p>

<h1 align="center">Foco</h1>

<p align="center">
  Organiza tus estudios y tus proyectos personales en un solo lugar.<br/>
  Una app para iPhone limpia, elegante y pensada para concentrarte.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-%E2%9C%93-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/estado-en%20desarrollo-lightgrey" alt="Estado" />
</p>

---

## ✨ Características

| | |
|---|---|
| ✅ **Tareas** | Con fecha límite, prioridad y notas. Se añaden en un par de toques. |
| 🎯 **Objetivos** | Con progreso calculado automáticamente según sus tareas. |
| 🗓️ **Horario** | Vista semanal y vista de hoy para clases y bloques de estudio. |
| 📘 **Asignaturas** | Configurables, con menú desplegable nativo. |
| 🚀 **Proyectos personales** | Con su propia lista de tareas y seguimiento. |
| 📊 **Progreso diario** | Porcentaje de tareas del día completadas, en tiempo real. |
| 🤖 **Asistente de IA** | Propone planes de estudio, divide objetivos en tareas y organiza tu semana. |
| 🌗 **Tema claro y oscuro** | Diseño minimalista, legible y accesible. |
| 🔔 **Recordatorios** | Notificaciones locales para fechas límite. |

## 📸 Capturas

> Próximamente.

## 🛠️ Tecnologías

- [Expo](https://expo.dev) y [React Native](https://reactnative.dev)
- [TypeScript](https://www.typescriptlang.org) en modo estricto
- [Expo Router](https://docs.expo.dev/router/introduction/) para la navegación
- [Zustand](https://zustand-demo.pmnd.rs) con persistencia en AsyncStorage
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) para los recordatorios
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) y [react-native-svg](https://github.com/software-mansion/react-native-svg) para animaciones y gráficos de progreso
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) para la respuesta háptica

## 📋 Requisitos

- [Node.js](https://nodejs.org) 18 o superior
- npm (o yarn / pnpm)
- Un iPhone con la app **Expo Go**, o bien:
  - Un Mac con **Xcode** y el simulador de iOS (para el development build)
  - O una cuenta de [EAS](https://expo.dev/eas) para compilar en la nube

## 🚀 Puesta en marcha

```bash
# 1. Clona el repositorio
git clone https://github.com/<tu-usuario>/foco.git
cd foco

# 2. Instala las dependencias
npm install

# 3. Arranca el proyecto
npx expo start
```

Escanea el código QR con la cámara del iPhone para abrir la app en **Expo Go**, o pulsa `i` en la terminal para abrirla en el simulador de iOS.

### Development build

Algunas funciones, como el menú desplegable nativo de iOS, necesitan código nativo que Expo Go no incluye. Para usarlas, genera un development build:

```bash
npx expo run:ios
```

> Requiere un Mac con Xcode. Sin él, puedes compilar en la nube con EAS:
> `eas build --profile development --platform ios`

## 🤖 Asistente de IA

Por defecto, Foco usa un **servicio simulado** (mock) para desarrollo, así que puedes probar el asistente sin configurar nada.

Para conectar un proveedor de IA real:

1. Crea un pequeño backend o una función serverless que guarde tu clave de API y reciba las peticiones de la app.
2. Define la URL del backend en un archivo `.env`:

```
   EXPO_PUBLIC_AI_ENDPOINT=https://tu-backend.example.com/chat
```

3. Activa la implementación real de `AIService` en `src/services/`.

> ⚠️ **Nunca pongas la clave de API dentro de la app.** Todo lo que va en el bundle de una app móvil, incluidas las variables `EXPO_PUBLIC_*`, es público y puede extraerse. La clave debe vivir solo en tu backend.

## 🗂️ Estructura del proyecto

```
foco/
├── assets/              # Logo, iconos y splash
├── src/
│   ├── app/             # Rutas (Expo Router)
│   ├── components/      # Componentes reutilizables
│   ├── features/        # tasks, goals, schedule, assistant, subjects, projects
│   ├── store/           # Estado global (Zustand)
│   ├── services/        # AIService, notificaciones
│   ├── theme/           # Colores, tipografía y espaciados
│   ├── utils/
│   └── types/
├── app.json
└── package.json
```

## 🎨 Diseño

- Paleta sobria en blanco y negro con un único color de acento índigo.
- Tema claro y oscuro, siguiendo el del sistema o elegido manualmente.
- Tipografía del sistema, buen contraste y soporte de VoiceOver.

## 📜 Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo |
| `npm run ios` | Abre la app en el simulador de iOS |
| `npm run lint` | Ejecuta el linter |
| `npm run typecheck` | Comprueba los tipos con TypeScript |

## 🧭 Hoja de ruta

- [x] Estructura, tema y componentes base
- [ ] Asignaturas y proyectos personales
- [ ] Tareas y progreso diario
- [ ] Objetivos
- [ ] Horario
- [ ] Asistente de IA
- [ ] Notificaciones
- [ ] Widgets y atajos de Siri

## 🤝 Contribuir

Las ideas y sugerencias son bienvenidas. Abre un *issue* para comentar qué te gustaría cambiar antes de enviar un *pull request*.

## 📄 Licencia

Distribuido bajo licencia MIT. Consulta el archivo `LICENSE` para más información.
