# Rediseño de la pestaña Tareas

Fecha: 2026-10-26 · App: Foco (Expo SDK 58, Expo Router, React Native) · Interfaz en español de España.

## Por qué

La pestaña Tareas actual se siente compacta, complicada y mal organizada. Tiene un selector de cuatro segmentos (Tareas · Exámenes · Rutinas · Metas), un filtro por categoría, cuatro secciones por fecha y tarjetas densas (notas, «Prioridad media», papelera en cada fila). Además, su aspecto es anterior al diseño nuevo que ya usa el Inicio.

El objetivo es que, al abrir Tareas, el estudiante vea de un vistazo **qué le queda de cada asignatura** y tenga **rutinas y metas siempre a un toque**, aunque tenga muchas asignaturas o muchas tareas.

## Objetivos

- Organizar el trabajo **por asignatura**: cada asignatura es una tarjeta con su próximo examen y sus tareas pendientes juntas.
- **Rutinas y Metas siempre visibles** arriba, en dos tarjetas pequeñas fijas que muestran su estado sin entrar («1 de 2 hoy», «60 %»).
- Que aguante **siete o más asignaturas** sin volverse una lista interminable.
- Aplicar el **diseño nuevo** del Inicio: filas como las de «Hoy» (casilla cuadrada, punto de color, chips de tipo), tarjetas con borde fino y radio 20–24, tipografía Manrope y tokens de `theme/tokens.ts`.

## No objetivos

- No cambiar el modelo de datos (tareas, exámenes, rutinas, objetivos y proyectos siguen igual) ni el almacenamiento o la sincronización.
- No rediseñar los formularios de crear y editar (tarea, examen, rutina, objetivo, proyecto). Se revisará su diseño después, al probar el flujo de añadir.
- No tocar Inicio, Calendario ni Foco IA, salvo los enlaces que apuntan a Tareas.

## Anti-objetivos (sería un fracaso aunque funcione)

- Que Rutinas o Metas vuelvan a quedar escondidas al final de una lista larga.
- Que vuelva a amontonarse: selectores, filtros y textos repetidos en cada fila.
- Abrir una hoja encima de otra de forma que en iOS fallen los gestos o el teclado.

## Diseño de la pantalla (decidido con el usuario: opción «B2»)

De arriba abajo:

1. **Título «Tareas».**
2. **Dos tarjetas fijadas**, una al lado de la otra:
   - **Rutinas hoy**: «1 de 2» y la siguiente rutina pendiente con su hora (o «Hoy no toca ninguna»). Al tocarla se abre la hoja de Rutinas.
   - **Metas**: porcentaje medio de avance y «2 objetivos · 1 proyecto». Al tocarla se abre la hoja de Metas.
3. **Interruptor «Por asignatura · Por fecha».** Por defecto, «Por asignatura».
4. **Contenido**:
   - **Por asignatura**: una tarjeta por asignatura con:
     - Punto de color, nombre y «N pendientes».
     - Si tiene un examen próximo, una franja naranja «Parcial 1 · en 5 días · 40 % repasado». Al tocarla se edita el examen.
     - Como mucho **2 tareas pendientes** (la más urgente primero) y un «+N más» que despliega el resto.
     - Un «Ver completadas» al final de la tarjeta desplegada.
   - **Por fecha**: una lista única con secciones **Atrasadas · Hoy · Esta semana · Más adelante**. «Completadas» va plegada al final. Usa las mismas filas nuevas.
5. **Botón + flotante**: pregunta qué crear (tarea, examen, rutina, objetivo o proyecto) y abre el formulario que ya existe.

### Comportamiento propuesto por el asistente (aceptado en la conversación)

- **Desaparecen el selector de cuatro segmentos y el filtro por categoría.** Agrupar por asignatura ya filtra.
- **Los exámenes viven dentro de su asignatura.** No hay vista de exámenes aparte. Los exámenes sin asignatura van en una tarjeta «Sin asignatura».
- **Orden de las tarjetas: por urgencia.** Primero la asignatura con la fecha más cercana, sea una tarea pendiente (las atrasadas cuentan como lo más urgente) o un examen próximo. A igualdad, se respeta el orden de asignaturas del usuario.
- **Tarjetas plegadas**: una asignatura sin tareas pendientes ni examen en los próximos 7 días se muestra plegada en una sola línea («Inglés · examen en 12 días ›» o «Física · al día ›»). Al tocarla se despliega.
- **Lo que no es de una asignatura**: cada proyecto personal con tareas es una tarjeta más, con su color, después de las asignaturas. Las tareas sin categoría van en «Sin asignatura», al final.
- **Filas de tarea**: casilla cuadrada, título, una línea de detalle (chip de tipo si no es «Tarea» y la fecha relativa: «hoy», «jueves», «24 oct»). Las atrasadas tienen la fecha en rojo. La prioridad alta se marca con un punto o una etiqueta discreta, no con el texto «Prioridad media» en cada fila. Al tocar la fila se edita; al tocar la casilla se completa. Sin papelera en la fila: se borra desde el formulario.
- **Completadas**: no se ven por defecto en «Por asignatura», solo con «Ver completadas».

## Rutinas y Metas como hojas (decidido con el usuario: «hojas desde abajo»)

Rutinas y Metas se abren como **hojas nativas desde abajo** encima de Tareas (Expo Router `presentation: 'formSheet'`):

- Se abren a media altura y se pueden ampliar a pantalla completa. Detentes propuestos: `[0.6, 1]`. Tienen tirador (`sheetGrabberVisible`) y radio 24.
- Se cierran deslizando hacia abajo.
- Son rutas propias (`/routines` y `/goals`), así que los enlaces desde otras pantallas siguen funcionando.
- Dentro reutilizan las vistas actuales `RoutinesView` y `GoalsView`, con un título propio. En Android, las hojas nativas no muestran la cabecera de la pila.

**Riesgo a comprobar al construir**: la documentación de Expo no cubre abrir un formulario (`Modal` de React Native) desde dentro de una hoja `formSheet`. Si en iOS falla (gestos, teclado o el formulario no aparece), el plan B es presentar esos formularios también como rutas con hoja o integrarlos dentro de la misma hoja.

## Enlaces desde otras pantallas

| Desde | Hoy | Con el diseño nuevo |
|---|---|---|
| Calendario › rutina en la agenda | `/tasks?view=routines` | Abre la hoja `/routines` |
| Inicio › tarjeta «Próximo examen» | `/tasks?view=exams` | Abre Tareas y el formulario de ese examen (`/tasks?examId=…`) |
| Metas › objetivo › «Ver tareas» | `/tasks?goalId=…` | Cierra la hoja y muestra «Por fecha» filtrado por ese objetivo, con un chip «Objetivo: … ✕» para quitar el filtro |
| Metas › proyecto › «Ver tareas» | `/tasks?categoryId=…&categoryType=project` | Igual, filtrado por el proyecto, con chip «Proyecto: … ✕» |

## Enfoques considerados

- **A · Pantallas propias que se abren a la derecha.** Robusto y barato (reutiliza vistas y rutas), pero se navega un nivel hacia dentro. El usuario prefirió algo más ligero y opcional.
- **B · Hojas desde abajo, elegido.** Más ligero: no «sales» de Tareas. Hecho con hojas nativas que además son rutas, se conservan las ventajas de A (enlaces, gesto de volver) y se evita apilar `Modal` de React Native a mano.
- **Descartado: Rutinas y Metas como pestañas de la barra inferior.** Contradice la decisión B2 de tenerlas dentro de Tareas.

## Restricciones

- Expo SDK 58 y Expo Router. Antes de usar una API de Expo, consultar la documentación de esa versión.
- Usar los tokens de color, radios y fuente de `src/theme/`, sin colores sueltos. Zonas táctiles de al menos 44 pt y `accessibilityLabel` en los botones que solo tienen icono.
- Iconos con `SymbolIcon` (SF Symbols / Material), nunca emojis.
- Sin dependencias nuevas.
- Cambios quirúrgicos: no reescribir los formularios ni la lógica de datos.

## Lo que queda a criterio de quien construya

- La forma exacta de calcular la urgencia y el «7 días» para plegar, siempre que respete lo descrito.
- La animación de desplegar y plegar tarjetas (sencilla, y respetando «Reducir movimiento»).
- Dónde extraer componentes (por ejemplo, `features/tasks/subject-card.tsx`, `pinned-cards.tsx` y `task-row.tsx` nuevo).
- Pruebas: la lógica pura (agrupar por asignatura, ordenar por urgencia, decidir plegado y las secciones de «Por fecha») debe tener pruebas en `tests/` con `npm run test:logic`.

## Decisiones tomadas por el asistente (revísalas)

- Detentes de las hojas: `[0.6, 1]`.
- Umbral para plegar una asignatura: 7 días sin nada.
- Máximo de tareas visibles por tarjeta: 2.
- La prioridad alta se marca de forma discreta (punto o etiqueta) en lugar de con texto en cada fila.
- Tareas de proyectos como tarjetas propias después de las asignaturas; las tareas sin categoría, en «Sin asignatura».
- Inicio › Próximo examen abre directamente el formulario de ese examen.
- El porcentaje de la tarjeta **Metas** es la media del avance (tareas completadas entre vinculadas) de los objetivos en curso y los proyectos activos. Sin ninguno, muestra «—» y «Crea tu primera meta».
- Si una asignatura tiene **varios exámenes próximos**, la franja muestra el más cercano. Los demás aparecen al desplegar la tarjeta.
- En **«Por fecha»**, los exámenes también aparecen en la sección de su día, como fila naranja con su hora.
- El selector del botón **+** usa de momento la hoja de acciones nativa (`Alert` en iOS). Su diseño se revisará al probar el flujo de añadir, como pidió el usuario.
