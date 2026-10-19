<!-- Logo incluido en este repositorio -->
<p align="center">
  <img src="assets/foco-icon-dark.png" alt="Logo de Foco" width="144" />
</p>

<h1 align="center">Foco</h1>

<p align="center">Organiza tus estudios y proyectos personales con calma, claridad y un plan diario.</p>
<p align="center">Aplicación móvil creada con Expo, React Native y TypeScript.</p>

## Características

| Área | Qué puedes hacer |
| --- | --- |
| Inicio | Consultar el progreso diario, las tareas de hoy, el siguiente bloque del horario y un objetivo destacado. |
| Tareas | Crear, editar, completar y filtrar tareas por fecha, prioridad, asignatura, proyecto u objetivo. |
| Asignaturas | Gestionar asignaturas, sus colores y su orden. |
| Objetivos y proyectos | Definir objetivos y gestionar proyectos personales con tareas y progreso. |
| Horario | Crear bloques semanales de estudio o proyectos y consultar el horario de hoy o de la semana. |
| Asistente | Recibir sugerencias locales o conectar un backend propio. Las propuestas se aceptan antes de guardarse. |
| Personalización | Elegir tema del sistema, claro u oscuro; configurar recordatorios y preferencias de progreso. |
| Datos de ejemplo | Cargar datos para probar la app durante el desarrollo. |

El estado se guarda localmente en el dispositivo con Zustand y AsyncStorage. No hace falta crear una cuenta.

## Tecnologías

- Expo SDK 57, React Native 0.86 y TypeScript.
- Expo Router para rutas y pestañas.
- Zustand persistido en AsyncStorage.
- expo-notifications para recordatorios locales.
- expo-haptics, react-native-svg, React Native Reanimated y date-fns.
- Selectores nativos de fecha y categoría compatibles con Expo Go.

## Requisitos

- Node.js 22.13 o posterior y npm.
- Para ejecutar el simulador o compilar iOS localmente: macOS, Xcode compatible con Expo SDK 57 y un simulador de iOS. Consulta los [requisitos de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) antes de actualizar Xcode.
- Para Expo Go: un iPhone o dispositivo Android con Expo Go instalado.

## Empezar

Instala las dependencias:

~~~bash
npm install
~~~

Arranca Expo:

~~~bash
npx expo start
~~~

Escanea el código QR con Expo Go. En macOS, pulsa i para abrir el simulador de iOS; para Android, ejecuta npx expo start --android.

Comandos disponibles:

~~~bash
npm run ios       # inicia Expo y abre el simulador de iOS
npm run android   # inicia Expo y abre Android
npm run web       # inicia la versión web
npm run lint      # ejecuta ESLint mediante Expo
npm run typecheck # comprueba TypeScript sin emitir archivos
~~~

### Expo Go y compilaciones nativas

Las funciones implementadas usan módulos incluidos en Expo Go, incluidos los selectores de fecha y expo-notifications para programar notificaciones locales. No hace falta un development build para probar este flujo local en un dispositivo compatible. Las notificaciones push remotas no están implementadas; Expo Go en Android no las admite. Consulta la [documentación de notificaciones de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

Para compilar y ejecutar la app nativa localmente en iOS necesitas macOS y Xcode:

~~~bash
npx expo run:ios
~~~

El comando genera los proyectos nativos cuando hace falta. Este repositorio usa Continuous Native Generation: no guardes cambios manuales dentro de ios/ o android/; configura esos cambios en Expo o mediante config plugins.

## Asistente y backend de IA

Sin una URL configurada, el asistente usa MockAIService: una demostración local que prepara tareas y un bloque horario para que decidas si aceptarlos. No llama a un proveedor de IA.

Para conectar un proveedor real:

1. Crea un backend o función serverless con un endpoint HTTPS POST, por ejemplo /api/foco.
2. Guarda la clave del proveedor como secreto en el servidor. **Nunca incluyas claves privadas en la app ni en variables EXPO_PUBLIC_.**
3. En Ajustes → Asistente de IA, guarda la URL del endpoint.
4. Acepta Content-Type: application/json y un cuerpo con esta forma:

   ~~~json
   {
     "message": "Ayúdame a organizar la semana",
     "context": {
       "subjects": [],
       "projects": [],
       "tasks": [],
       "goals": [],
       "scheduleBlocks": []
     }
   }
   ~~~

5. Devuelve JSON con message y suggestions. Cada propuesta debe seguir uno de los tipos definidos en src/services/ai-service.ts: task, scheduleBlock o priority.

El contrato está en src/services/ai-service.ts. BackendAIService contiene la llamada HTTP y AIService permite cambiar de proveedor. Valida en el servidor las salidas del modelo. Al configurar el endpoint, la app envía el contexto de asignaturas, proyectos, tareas, objetivos y horario; usa un servidor de confianza y explica a tus usuarios cómo tratará esos datos.

## Datos y sincronización

Foco guarda todo en el dispositivo (Zustand + AsyncStorage) y funciona sin conexión. La sincronización con una cuenta está preparada, pero desactivada: llegará con el inicio de sesión con Apple y Google.

- src/data/sync-engine.ts apunta qué registros cambian (en un almacén aparte, foco-sync-v1) sin tocar las pantallas. Sin almacén remoto configurado, syncNow() no hace nada.
- src/data/sync-logic.ts contiene la lógica pura: detectar cambios, fusionar con «gana la edición más reciente» y preparar lo pendiente. Al vincular una cuenta se suben todos los datos locales, así que no se pierde nada.
- Para añadir una entidad sincronizada, regístrala en src/data/entities.ts y en el check de entity de la migración.

### Supabase

El backend elegido es Supabase. El esquema está en supabase/migrations/: una tabla user_records con una fila por registro y usuario.

**Row Level Security es obligatorio en todas las tablas.** Cada tabla nueva debe:

1. Activar RLS: alter table ... enable row level security.
2. Tener políticas de select, insert, update y delete limitadas a to authenticated y a (select auth.uid()) = user_id.
3. Revocar los permisos por defecto de anon y authenticated, y conceder solo los necesarios.

Después de cada migración, ejecuta supabase/tests/rls_check.sql: debe devolver cero filas. La app solo usa la clave publicable; la clave service_role nunca va en la app.

## Estructura

~~~text
src/
├── app/           # rutas Expo Router: pestañas, entrada y onboarding
├── components/    # componentes compartidos
├── data/          # capa de sincronización (local ahora, Supabase después)
├── features/      # inicio, tareas, objetivos, perfil y entrada
├── services/      # asistente, recordatorios y datos de demostración
├── store/         # estado global y persistencia local
├── theme/         # colores, espaciado y tema
├── types/         # modelos TypeScript
└── utils/         # funciones auxiliares
assets/            # iconos y splash de Foco para tema claro y oscuro
supabase/          # migraciones SQL y comprobación de RLS
~~~

## Hoja de ruta

- [x] Estructura, tema y componentes base.
- [x] Modelos de datos y persistencia local.
- [x] Asignaturas y proyectos personales.
- [x] Tareas, filtros y progreso diario.
- [x] Objetivos vinculados a tareas.
- [x] Horario semanal y vista de hoy.
- [x] Asistente con mock local y contrato para backend.
- [x] Inicio, preferencias, recordatorios y datos de ejemplo.
- [x] Pulido visual, accesibilidad, documentación y configuración de Git.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta [LICENSE](LICENSE).
