# Pasar al calendario un plan de estudio ya hecho

## Para qué

El estudiante ya tiene un plan, suyo o de un profesor («día 1: tema 3 de Cálculo», «3 nov: ejercicios de Física»…) y quiere verlo en el calendario sin apuntarlo bloque a bloque. El plan puede durar un mes o ir entre unas fechas concretas, no solo la próxima semana. El plan dice **qué toca cada día**, pero no a qué hora. Aparte, el estudiante dice **qué días de la semana y en qué horario puede** estudiar («de lunes a viernes, de 17 a 20»).

## Objetivos

- Pegar el plan en el chat de Foco IA, junto con los días y el horario disponibles, y que salga una vista previa con todos los bloques colocados y el botón **Añadir todos**.
- Que funcione con planes de hasta unos tres meses.
- Que no se pise con clases, exámenes, rutinas con hora ni otros bloques de estudio.

## No objetivos

- Leer fotos o PDF del plan: solo texto pegado.
- Deshacer en bloque después de añadir. La vista previa y la confirmación son la red de seguridad, y cada bloque se puede borrar suelto.
- Cambiar cómo funcionan los planes cortos que ya propone la IA.

## Antiobjetivos

- Que se coman el cupo: el texto del chat crece solo lo imprescindible.
- Que la IA invente fechas u horas que pisen clases.

## Restricciones

- Tienen que seguir valiendo el cupo de 30 mensajes al día por usuario, el cupo global y la regla de no mandar a la IA datos personales que no hagan falta.
- El cambio en `supabase/functions/foco-ai` lo despliega el usuario (`npx supabase functions deploy foco-ai`).

## Enfoques

- **A. La IA hace todo** (elige día y hora de cada bloque). Para un mes habría que mandarle todos los huecos libres de 30 días o más y devolvería 30–60 bloques con fecha y hora. Es más caro, más lento y propenso a errores de fechas. Descartado.
- **B. La IA lee y la app coloca** (**elegido por el usuario**). La IA solo pasa el texto a una lista estructurada y la app coloca cada cosa con reglas fijas y probadas.
- **Sin IA** (un formulario para pegar el plan): entender texto libre sin IA es frágil. Descartado.

## Cómo funciona (B)

### 1. La IA: nuevo campo `import_plan` en la respuesta

- Va vacío salvo cuando el estudiante pasa un plan para el calendario.
- Si falta la disponibilidad (días u horario), la IA lo pregunta en `message` y deja `import_plan` vacío.
- Forma (JSON estricto, todos los campos obligatorios; vacío = `""`, `[]` o `0`):

```
import_plan: {
  start_date: "YYYY-MM-DD" | "",   // desde cuándo, si el plan no trae fechas
  weekdays: [0..6],                  // días que puede (0 domingo … 6 sábado)
  start_time: "HH:mm", end_time: "HH:mm",  // horario que puede
  items: [{ date: "YYYY-MM-DD" | "", title, subject, minutes }]  // en el orden del plan
}
```

- `minutes` vale 0 si el plan no dice cuánto dura.
- `subject` es el nombre exacto de una asignatura o `""`.

**Límites:**
- máximo **60 items**;
- fechas entre hoy y **92 días** vista;
- `minutes` entre 15 y 240;
- se limpia igual que el resto de la salida del modelo (`sanitizeReply`).

**Texto:**
- El mensaje del usuario pasa de 2000 a **4000 caracteres** como máximo. Es el único límite de texto que crece.
- La salida sigue siendo pequeña: unos 60 items de una línea, sin horas.

### 2. La app coloca: `schedulePlanImport` (lógica pura, con tests)

**Entrada:** `import_plan`, los datos del calendario y `now`.
**Salida:** `{ blocks: PlanItem[], unplaced: { title, reason }[] }`.

**Reglas:**
- **Duración:** `minutes`, o **60 min** si no consta *(decisión mía)*.
- **Items con fecha:** van ese día aunque no esté entre sus `weekdays`, porque manda el plan. Se colocan dentro de su horario, en el primer hueco que quepa. Los items del mismo día van uno detrás de otro.
- **Items sin fecha:** se reparten **uno por día disponible** *(decisión mía)*, en orden, desde `start_date` o desde mañana si no hay. Si un día no tiene sitio, pasan al siguiente día disponible.
- **Ocupado:** clases, exámenes, rutinas con hora, bloques de estudio y los bloques ya colocados del propio plan (la misma agenda que usa el calendario).
- **Lo que no cabe** en 92 días va a `unplaced` con el motivo: «no hay hueco ese día» o «fuera de plazo».
- La colocación se hace **al llegar la respuesta** y el resultado se guarda en `message.plan`. Así reutiliza el botón y el guardado que ya tienen los planes de la IA (`addPlan`, `planAdded`).

### 3. Vista previa en el chat

La tarjeta de plan actual, adaptada a listas largas:
- **Cabecera:** «28 bloques · del 3 al 30 de noviembre».
- **Lista:** los 6 primeros y «y 22 más», desplegable.
- **Avisos:** «2 no caben: …».
- **Botón:** **Añadir todos al calendario**.

## Lo que queda para quien lo construya

- Cómo se ve exactamente la tarjeta con muchos bloques.
- Los textos de los avisos.
- Probar el `SYSTEM_INSTRUCTION` con un par de planes reales.
