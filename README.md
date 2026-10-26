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

## Foco IA

Foco IA llama a un modelo abierto a través de Groq (plan gratuito) desde la Edge Function supabase/functions/foco-ai. La clave es un secreto del servidor (GROQ_API_KEY) y nunca llega a la app. Gemini sigue disponible como alternativa con AI_PROVIDER=gemini y GEMINI_API_KEY.

- **Sesión**: quien usa Foco sin cuenta entra con una sesión anónima de Supabase, invisible para el usuario.
- **Límite**: 30 mensajes al día por usuario (FOCO_AI_DAILY_LIMIT), en la tabla ai_usage, con RLS activado y sin acceso directo desde la app. Si falla el servidor o el proveedor, el mensaje se devuelve al cupo; solo la función puede hacerlo.
- **Resumen por chat**: la IA mantiene un resumen de cada chat y lo recibe junto a los últimos mensajes, así puede retomar la conversación otro día. Se ve arriba del chat.
- **Datos enviados**: src/services/ai-context.ts decide qué recibe la IA: asignaturas, exámenes, tareas pendientes, bloques, rutinas, clases y huecos libres. Nunca el nombre, el correo, las notas ni identificadores. Las respuestas se validan en el servidor.
- **Sin Supabase configurado**: la app responde con una demostración local.

### Puesta en marcha

1. Crea el proyecto en Supabase (región de la UE) y activa **Allow anonymous sign-ins** y **Allow manual linking**.
2. Copia .env.example como .env con la Project URL y la Publishable key.
3. Crea una clave en console.groq.com y guárdala en **Edge Functions → Secrets** como GROQ_API_KEY.
4. Aplica las migraciones y despliega la función:

   ~~~bash
   npx supabase login
   npx supabase link --project-ref <id-del-proyecto>
   npx supabase db push         # pide la contraseña de la base de datos
   npx supabase functions deploy foco-ai
   ~~~

### Pruebas

npm run test:logic ejecuta las pruebas de la lógica sin dependencias de React Native (por ahora, la de foco-ai).

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
