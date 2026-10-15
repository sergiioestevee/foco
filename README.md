<p align="center">
  <img src="assets/foco-icon-dark.png" width="140" alt="Logo de Foco" />
</p>

<h1 align="center">Foco</h1>

<p align="center">
  Organiza tus estudios y tus proyectos personales en un solo lugar.<br/>
  Una app nativa para iPhone, limpia, elegante y pensada para concentrarte.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/iOS-17%2B-black?logo=apple" alt="iOS 17+" />
  <img src="https://img.shields.io/badge/Swift-5.9-orange?logo=swift" alt="Swift" />
  <img src="https://img.shields.io/badge/SwiftUI-%E2%9C%93-blue" alt="SwiftUI" />
  <img src="https://img.shields.io/badge/estado-en%20desarrollo-lightgrey" alt="Estado" />
</p>

---

## ✨ Características

| | |
|---|---|
| ✅ **Tareas** | Con fecha límite, prioridad y notas. Se añaden en un par de toques. |
| 🎯 **Objetivos** | Con progreso calculado automáticamente según sus tareas. |
| 🗓️ **Horario** | Vista semanal y vista de hoy para clases y bloques de estudio. |
| 📘 **Asignaturas** | Configurables, con selector desplegable nativo. |
| 🚀 **Proyectos personales** | Con su propia lista de tareas y seguimiento. |
| 📊 **Progreso diario** | Porcentaje de tareas del día completadas, en tiempo real. |
| 🤖 **Asistente de IA** | Propone planes de estudio, divide objetivos en tareas y organiza tu semana. |
| 🌗 **Tema claro y oscuro** | Diseño minimalista, legible y accesible. |

## 📸 Capturas

> Próximamente.

## 🛠️ Tecnologías

- **Swift** y **SwiftUI**
- **SwiftData** para la persistencia local
- **UserNotifications** para recordatorios
- Arquitectura **MVVM**

## 📋 Requisitos

- iOS 17 o superior
- Xcode 15 o superior

## 🚀 Puesta en marcha

```bash
git clone https://github.com/<tu-usuario>/foco.git
cd foco
open Foco.xcodeproj
```

Selecciona un simulador de iPhone y pulsa **Run** (⌘R).

## 🤖 Asistente de IA

Por defecto, Foco usa un servicio simulado para desarrollo. Para conectar un proveedor real:

1. Crea el archivo `Secrets.xcconfig` (está en `.gitignore`).
2. Añade tu clave: `AI_API_KEY = tu_clave`.
3. Cambia la implementación de `AIService` en la configuración de la app.

> La clave de API nunca debe subirse al repositorio.

## 🗂️ Estructura del proyecto

```
Foco/
├── Models/
├── ViewModels/
├── Views/
├── Services/
├── Components/
└── Resources/
```

## 🧭 Hoja de ruta

- [x] Modelos y persistencia
- [x] Tema y sistema de diseño
- [ ] Tareas y progreso diario
- [ ] Objetivos
- [ ] Horario
- [ ] Asistente de IA
- [ ] Widgets y atajos de Siri

## 📄 Licencia

Distribuido bajo licencia MIT. Consulta el archivo `LICENSE` para más información.
