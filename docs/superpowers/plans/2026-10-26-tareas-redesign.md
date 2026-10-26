# Rediseño de la pestaña Tareas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la pestaña Tareas en un tablero por asignatura con dos tarjetas fijas (Rutinas hoy y Metas) que abren hojas nativas, más una vista alternativa «Por fecha».

**Architecture:** Toda la lógica de agrupar, ordenar, plegar y seccionar va en un módulo puro (`src/features/tasks/task-board.ts`) con pruebas en Node. La UI se compone de piezas pequeñas en `src/features/tasks/`. Rutinas y Metas pasan a ser rutas raíz (`/routines`, `/goals`) presentadas como `formSheet` de Expo Router y reutilizan `RoutinesView` y `GoalsView`.

**Tech Stack:** Expo SDK 58, Expo Router (native stack `formSheet`), React Native 0.88, Zustand, date-fns 4, Reanimated 4. Pruebas de lógica con `node --test` (`npm run test:logic`).

**Spec:** `docs/superpowers/specs/2026-10-26-tareas-redesign-design.md`

## Global Constraints

- Interfaz en español de España; textos exactos de la spec: «Rutinas hoy», «Metas», «Por asignatura», «Por fecha», «Atrasadas», «Hoy», «Esta semana», «Más adelante», «Completadas», «Ver completadas», «Sin asignatura», «Hoy no toca ninguna», «Crea tu primera meta», «+N más».
- Colores, radios y fuente solo desde `src/theme/` (`useTheme()`, `radii`, `spacing`, `minTouchSize`); nada de colores sueltos.
- Zonas táctiles ≥ 44 pt (`minTouchSize`); `accessibilityLabel` en botones solo con icono; iconos con `SymbolIcon`, nunca emojis.
- Sin dependencias nuevas. Antes de usar una API de Expo, consultar los docs de SDK 58.
- Hojas: `presentation: 'formSheet'`, `sheetAllowedDetents: [0.6, 1]`, `sheetGrabberVisible: true`, `sheetCornerRadius: 24`.
- Plegar una asignatura si no tiene tareas pendientes con fecha ≤ 7 días (las atrasadas cuentan) ni examen en ≤ 7 días. Máximo 2 tareas visibles por tarjeta.
- No modificar formularios (tarea, examen, rutina, objetivo, proyecto) salvo lo que pida una tarea concreta; no tocar el modelo de datos ni el store.
- Commits: **solo si el usuario lo pide** (preferencia del usuario). Donde la skill pide «Commit», este plan pide un punto de control (`tsc` + `lint` + pruebas).

## Review Focus

1. **Usuario sin asignaturas** (todo sin categoría): el tablero no queda vacío ni falla; muestra la tarjeta «Sin asignatura» o el estado vacío. → prueba en Task 1.
2. **Tarea cuya asignatura se borró** (`categoryId` que ya no existe): aparece en «Sin asignatura», no desaparece. → prueba en Task 1.
3. **Tareas sin fecha**: no se pierden; en «Por fecha» van a «Más adelante» (al final) y en la tarjeta tras las fechadas. → pruebas en Task 1.
4. **Examen de hoy a una hora ya pasada**: sigue contando como «hoy» y como urgente; los exámenes de días anteriores no aparecen. → prueba en Task 1.
5. **Filtro por objetivo o proyecto sin tareas** (desde «Ver tareas» en Metas): se ve el chip para quitar el filtro y un mensaje, no una pantalla en blanco. → comprobación manual en Task 5.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/features/tasks/task-board.ts` (nuevo) | Lógica pura: tablero por asignatura, secciones por fecha, resúmenes de rutinas y metas, etiqueta de fecha |
| `tests/task-board.test.ts` (nuevo) | Pruebas de `task-board.ts` |
| `src/features/tasks/task-list-row.tsx` (nuevo) | Fila nueva de tarea y fila de examen |
| `src/features/tasks/subject-card.tsx` (nuevo) | Tarjeta de asignatura/proyecto, plegada o desplegada |
| `src/features/tasks/pinned-cards.tsx` (nuevo) | Tarjetas fijas «Rutinas hoy» y «Metas» |
| `src/features/tasks/by-date-list.tsx` (nuevo) | Vista «Por fecha» |
| `src/features/tasks/add-menu.tsx` (nuevo) | Selector del botón + |
| `src/app/routines.tsx`, `src/app/goals.tsx` (nuevos) | Rutas en hoja nativa |
| `src/app/_layout.tsx` | Registrar las dos hojas |
| `src/app/(tabs)/tasks.tsx` | Reescritura de la pantalla |
| `src/app/(tabs)/calendar.tsx`, `src/app/(tabs)/index.tsx`, `src/features/goals/progress-card.tsx` | Enlaces nuevos |
| `src/features/tasks/task-row.tsx`, `src/features/exams/exams-view.tsx` | Se borran (sin uso tras la reescritura) |

---

### Task 1: Lógica del tablero (`task-board.ts`)

**Files:**
- Create: `src/features/tasks/task-board.ts`
- Test: `tests/task-board.test.ts`

**Interfaces:**
- Consumes: `sortTasksByDueDateAndPriority`, `isTaskOverdue` (`@/features/tasks/task-date-utils`), `getUpcomingExams`, `formatCountdown` (`@/features/exams/exam-utils`), `getRoutinesForDay`, `isRoutineDoneOn` (`@/features/routines/routine-utils`); tipos de `@/types/models`.
- Produces:
  ```ts
  export type BoardCategory = { key: string; kind: 'subject' | 'project' | 'none'; id: string | null; name: string; color: string | null };
  export type BoardCard = {
    category: BoardCategory;
    pending: Task[];        // sortTasksByDueDateAndPriority
    completed: Task[];
    exams: Exam[];          // próximos, el más cercano primero
    urgency: number | null; // timestamp de la fecha más urgente (tarea pendiente o examen); null si nada
    collapsed: boolean;
  };
  export function buildSubjectBoard(input: { tasks: Task[]; exams: Exam[]; subjects: Subject[]; projects: PersonalProject[] }, now?: Date): BoardCard[];
  export function collapsedLabel(card: BoardCard, now?: Date): string;
  export type DateItem = { type: 'task'; task: Task } | { type: 'exam'; exam: Exam };
  export type DateSection = { key: 'overdue' | 'today' | 'week' | 'later' | 'completed'; title: string; items: DateItem[] };
  export function groupByDate(tasks: Task[], exams: Exam[], now?: Date): DateSection[];
  export function summarizeRoutinesToday(routines: Routine[], now?: Date): { done: number; total: number; next: Routine | null };
  export function summarizeGoals(goals: Goal[], projects: PersonalProject[], tasks: Task[]): { percent: number | null; goals: number; projects: number };
  export function formatDueLabel(dueDate: string, now?: Date): { label: string; overdue: boolean };
  ```

Reglas (de la spec y decisiones aceptadas):
- `buildSubjectBoard`: una tarjeta por **cada asignatura** (aunque esté vacía) en este orden: asignaturas por `urgency` ascendente (`null` al final; empate → `subject.order`); después **proyectos con alguna tarea pendiente** por urgencia y luego nombre; al final **«Sin asignatura»** (`key: 'none'`) solo si tiene tareas pendientes o exámenes. Las tareas cuya categoría no existe y los exámenes con `subjectId` inexistente o `null` van a «Sin asignatura». `collapsed`: ninguna tarea pendiente con fecha ≤ ahora + 7 días (las atrasadas cuentan) y ningún examen en ≤ 7 días.
- `collapsedLabel`: examen próximo → `"examen ${formatCountdown}"` (p. ej. «examen en 12 días»); si no, pendientes > 0 → «1 pendiente» / «N pendientes»; si no → «al día».
- `groupByDate`: `overdue` = pendientes atrasadas; `today` = pendientes de hoy + exámenes de hoy; `week` = pendientes y exámenes de mañana al domingo de esta semana (`weekStartsOn: 1`); `later` = resto con fecha y, al final, las pendientes sin fecha; `completed` = completadas. Títulos: «Atrasadas», «Hoy», «Esta semana», «Más adelante», «Completadas». Se omiten secciones vacías. Exámenes de días anteriores no aparecen.
- `summarizeRoutinesToday`: `total` = rutinas que tocan hoy; `done` = hechas hoy; `next` = primera no hecha según `getRoutinesForDay` (orden por hora).
- `summarizeGoals`: cuenta objetivos `inProgress` y proyectos `active`; `percent` = media redondeada del ratio completadas/vinculadas de los que tienen ≥ 1 tarea vinculada (objetivo: `task.goalId`; proyecto: `categoryType === 'project'`); `null` si ninguno tiene tareas.
- `formatDueLabel`: «hoy», «mañana», nombre del día en minúscula si está a ≤ 6 días («jueves»), si no `d MMM` sin punto («24 oct»); `overdue: true` si `isTaskOverdue`.

- [ ] **Step 1: Write the failing tests** en `tests/task-board.test.ts` (fecha fija `now = new Date(2026, 9, 26, 17, 0)`, lunes):
  - `buildSubjectBoard`: Cálculo con examen el 31-oct y Programación con entrega atrasada → orden `['Programación', 'Cálculo', …]`; asignatura sin nada → `collapsed: true`; Cálculo con tarea el 29-oct → `collapsed: false`; tarea con `categoryId: 'borrada'` → aparece en la tarjeta `key: 'none'`; sin asignaturas y dos tareas sueltas → una sola tarjeta «Sin asignatura»; proyecto sin pendientes → no aparece; examen de hoy a las 09:00 (ya pasado a las 17:00) → cuenta en `exams` y en `urgency`.
  - `collapsedLabel`: examen en 12 días → «examen en 12 días»; 3 pendientes → «3 pendientes»; nada → «al día».
  - `groupByDate`: claves en orden `['overdue', 'today', 'week', 'later', 'completed']` con datos en todas; examen del 24-oct (pasado) ausente; tarea sin fecha es el **último** ítem de `later`; entrada vacía → `[]`.
  - `summarizeRoutinesToday`: rutinas L–V 22:00 (hecha hoy) y L 08:00 (no hecha) → `{ done: 1, total: 2, next: <la de 08:00> }`; domingo sin rutinas → `{ done: 0, total: 0, next: null }`.
  - `summarizeGoals`: objetivo con 1/2 y proyecto con 1/1 → `{ percent: 75, goals: 1, projects: 1 }`; objetivos sin tareas → `percent: null`.
  - `formatDueLabel`: hoy → «hoy»; mañana → «mañana»; 29-oct → «jueves»; 10-nov → «10 nov»; 24-oct → `overdue: true`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm run test:logic`
  Expected: FAIL (`Cannot find module …task-board`).

- [ ] **Step 3: Implement `src/features/tasks/task-board.ts`** con las firmas y reglas de arriba.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm run test:logic` → todas en verde (incluidas las 23 de `foco-ai`).

- [ ] **Step 5: Checkpoint** — `npx tsc --noEmit` sin salida.

---

### Task 2: Filas y tarjeta de asignatura

**Files:**
- Create: `src/features/tasks/task-list-row.tsx`, `src/features/tasks/subject-card.tsx`

**Interfaces:**
- Consumes: `BoardCard`, `collapsedLabel`, `formatDueLabel` (Task 1); `taskKindLabel` (`@/features/tasks/task-kinds`); `formatCountdown` (`@/features/exams/exam-utils`).
- Produces:
  ```ts
  export function TaskListRow(props: { task: Task; onToggle: () => void; onEdit: () => void }): JSX.Element;
  export function ExamListRow(props: { exam: Exam; onPress: () => void }): JSX.Element; // fila naranja «Parcial 1 · en 5 días · 40 % repasado»
  export function SubjectCard(props: { card: BoardCard; onToggleTask: (task: Task) => void; onEditTask: (task: Task) => void; onEditExam: (exam: Exam) => void }): JSX.Element;
  ```

- `TaskListRow`: casilla cuadrada (24 pt dentro de un área de 44 pt) que llama a `onToggle`; el resto de la fila llama a `onEdit`. Título (tachado y `muted` si completada); detalle: chip de tipo si `kind !== 'task'` + `formatDueLabel` (en `theme.danger` si `overdue`). Prioridad alta: punto `theme.warn` de 8 pt con `accessibilityLabel` «Prioridad alta». Sin papelera ni notas. Mismo estilo que las filas de «Hoy» del Inicio (`radii.chip`, borde `hairlineWidth`, fondo `surf`).
- `SubjectCard`: cabecera (punto de color, nombre, «N pendientes» o `collapsedLabel`) pulsable para plegar/desplegar (`accessibilityState={{ expanded }}`). Estado inicial = `!card.collapsed`. Desplegada: franja del examen más cercano (`ExamListRow`), las 2 primeras de `pending`, botón «+N más» que muestra el resto, y «Ver completadas» que muestra `completed`. Otros exámenes próximos se ven al pulsar «+N más».

- [ ] **Step 1: Implement both files** con las props de arriba.
- [ ] **Step 2: Checkpoint** — `npx tsc --noEmit` y `npx expo lint` sin errores.

---

### Task 3: Tarjetas fijas y vista «Por fecha»

**Files:**
- Create: `src/features/tasks/pinned-cards.tsx`, `src/features/tasks/by-date-list.tsx`

**Interfaces:**
- Consumes: `summarizeRoutinesToday`, `summarizeGoals`, `groupByDate`, `DateSection` (Task 1); `TaskListRow`, `ExamListRow` (Task 2).
- Produces:
  ```ts
  export function PinnedCards(): JSX.Element; // lee el store; navega a '/routines' y '/goals'
  export function ByDateList(props: { tasks: Task[]; exams: Exam[]; onToggleTask: (task: Task) => void; onEditTask: (task: Task) => void; onEditExam: (exam: Exam) => void }): JSX.Element;
  ```

- `PinnedCards`: dos tarjetas en fila (`flex: 1`), `router.push('/routines')` y `router.push('/goals')`. Rutinas: etiqueta «RUTINAS HOY», valor «${done} de ${total}», debajo `next` como «${title} · ${time}» (sin hora: solo título) o «Hoy no toca ninguna» si `total === 0`. Metas: «METAS», valor «${percent}%» o «—», debajo «N objetivos · M proyectos» o «Crea tu primera meta» si ambos son 0. `accessibilityLabel` completo en cada tarjeta.
- `ByDateList`: una cabecera por sección (título + número) y sus filas; la sección `completed` empieza plegada con «Completadas (N)».

- [ ] **Step 1: Implement both files.**
- [ ] **Step 2: Checkpoint** — `npx tsc --noEmit` y `npx expo lint` sin errores.

---

### Task 4: Rutinas y Metas como hojas nativas

**Files:**
- Create: `src/app/routines.tsx`, `src/app/goals.tsx`
- Modify: `src/app/_layout.tsx` (junto a `<Stack.Screen name="chat/[id]" />`)
- Modify: `src/features/goals/progress-card.tsx` («Ver tareas»)

**Interfaces:**
- Consumes: `RoutinesView({ ref })`, `GoalsView({ ref })` existentes; `CreateHandle` (`@/types/create-handle`).
- Produces: rutas `/routines` y `/goals`; `/goals` acepta el parámetro `create: 'goal' | 'project'` y `/routines` acepta `create: '1'`, que abren el formulario correspondiente nada más montar (vía la `ref` de la vista).

- Registrar ambas pantallas con los valores de Global Constraints (`presentation: 'formSheet'`, detentes `[0.6, 1]`, tirador, radio 24).
- Cada ruta: título propio dentro del contenido («Rutinas» / «Metas»; en Android la cabecera del stack no se muestra en hojas) + `ScrollView` con la vista. Comprobar en los docs de SDK 58 cómo se comporta un `ScrollView` dentro de `formSheet` (`flex: 1` funciona en iOS con detentes numéricos).
- «Ver tareas» de objetivo y proyecto: en lugar de `Link` a `/tasks`, `router.dismissTo({ pathname: '/tasks', params })` (verificar `dismissTo` en los docs de Expo Router SDK 58; si no existe, `router.dismiss()` + `router.navigate`).

- [ ] **Step 1: Implement the two routes, register them, update «Ver tareas».**
- [ ] **Step 2: Checkpoint** — `npx tsc --noEmit` (los tipos de rutas deben incluir `/routines` y `/goals`) y `npx expo lint`.
- [ ] **Step 3: Manual check (iOS, Expo Go)** — Abrir `/routines` y `/goals` desde la consola de rutas o un enlace temporal: la hoja sale al 60 %, se amplía, se cierra deslizando; **crear una rutina y un objetivo desde dentro de la hoja** (riesgo de la spec: `Modal` dentro de `formSheet`). Si el formulario no aparece o el teclado/gestos fallan, aplicar el plan B de la spec antes de seguir y anotarlo.

---

### Task 5: Nueva pantalla Tareas y enlaces

**Files:**
- Create: `src/features/tasks/add-menu.tsx`
- Modify: `src/app/(tabs)/tasks.tsx` (reescritura), `src/app/(tabs)/calendar.tsx:54`, `src/app/(tabs)/index.tsx:98`
- Modify: `src/features/tasks/task-form-sheet.tsx` (props `TaskFormSheetProps`, línea 23): prop opcional `onDelete?: () => void`; si hay `task` y `onDelete`, botón «Eliminar tarea» en `theme.danger` al final, como en `ExamFormSheet`. Las filas ya no tienen papelera, así que es la única forma de borrar. `tasks.tsx` pasa un `onDelete` que confirma con `Alert` («Eliminar tarea» / «¿Quieres eliminar «…»?»), llama a `deleteTask` y cierra.
- Delete: `src/features/tasks/task-row.tsx`, `src/features/exams/exams-view.tsx`

**Interfaces:**
- Consumes: todo lo anterior; `TaskFormSheet` / `TaskDraft` (existentes); `ExamFormSheet({ exam, onClose })`; `RoutineFormSheet` no se usa aquí (las rutinas se crean en su hoja).
- Produces:
  ```ts
  export type AddChoice = 'task' | 'exam' | 'routine' | 'goal' | 'project';
  export function showAddMenu(onPick: (choice: AddChoice) => void): void; // iOS: ActionSheetIOS
  export function AddMenu(props: { visible: boolean; onPick: (choice: AddChoice) => void; onClose: () => void }): JSX.Element; // otras plataformas
  ```

Pantalla (de arriba abajo): `ScreenHeader` «Tareas» → `PinnedCards` → `SegmentedControl` «Por asignatura · Por fecha» → contenido → botón + flotante (el actual) → hueco final de 88 pt.
- **Por asignatura**: `buildSubjectBoard` → `SubjectCard`s. Sin ninguna tarjeta → estado vacío actual («Un paso cada vez…»).
- **Por fecha**: `ByDateList` con todas las tareas y exámenes.
- **Filtro desde Metas** (`goalId`, o `categoryId` + `categoryType === 'project'`): fuerza «Por fecha» con solo esas tareas (sin exámenes) y muestra arriba un chip «Objetivo: ${title} ✕» / «Proyecto: ${name} ✕» que quita los parámetros (`router.setParams` con `undefined`). Sin tareas → mensaje «Este objetivo todavía no tiene tareas» / «Este proyecto…» bajo el chip.
- **Parámetro `examId`**: abre `ExamFormSheet` con ese examen (patrón actual `routeKey` para no reabrirlo al volver).
- **Botón +**: `task` → `TaskFormSheet`; `exam` → `ExamFormSheet exam={null}`; `routine` → `router.push({ pathname: '/routines', params: { create: '1' } })`; `goal`/`project` → `router.push({ pathname: '/goals', params: { create } })`. Opciones: «Tarea», «Examen», «Rutina», «Objetivo», «Proyecto», «Cancelar».
- Se eliminan el selector de 4 segmentos, `CategoryPicker`, las refs de vistas y el parámetro `view`.
- Enlaces: Calendario (rutina) → `router.push('/routines')`; Inicio (próximo examen) → `router.push({ pathname: '/tasks', params: { examId: nextExam.id } })`.

- [ ] **Step 1: Implement `add-menu.tsx` and the `onDelete` prop of `TaskFormSheet`.**
- [ ] **Step 2: Rewrite `tasks.tsx`, update the two links, delete the two unused files.**
- [ ] **Step 3: Checkpoint** — `npx tsc --noEmit`, `npx expo lint`, `npm run test:logic`, y `npx expo export --platform ios --output-dir <scratchpad>/export` sin errores; `grep -rn "task-row\|exams-view\|view: 'routines'\|view: 'exams'" src` vacío.
- [ ] **Step 4: Manual check (Expo Go)** con «Cargar datos de ejemplo»: orden por urgencia; tarjeta plegada y «+N más»; marcar una tarea desde la tarjeta; «Por fecha» con sus secciones; tarjetas fijas abren las hojas; «Ver tareas» de un objetivo sin tareas muestra chip + mensaje (Review Focus 5); Inicio › Próximo examen abre su formulario; Calendario › rutina abre la hoja; el + crea cada uno de los cinco tipos; abrir una tarea y borrarla con «Eliminar tarea».
