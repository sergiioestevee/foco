# Inicio de sesión con Google: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Continuar con Google» funciona en la pantalla de entrada y en Perfil, y vincula la sesión anónima existente para conservar el usuario.

**Architecture:** Usa el flujo OAuth con PKCE de Supabase en el navegador del sistema (`expo-web-browser`). Si la sesión es anónima se usa `linkIdentity`; si no, `signInWithOAuth`. La lectura de la URL de vuelta es lógica pura y lleva tests. Un hook expone si la sesión es anónima o tiene cuenta, y Perfil lo muestra.

**Tech Stack:** Expo SDK 58, `@supabase/supabase-js` 2.118, `expo-web-browser`, `expo-linking`, Zustand. No se añaden dependencias.

**Spec:** `docs/superpowers/specs/2026-10-30-google-sign-in-design.md`

## Global Constraints

- No se instalan dependencias nuevas.
- No van secretos en la app: el ID y el secreto de Google solo se configuran en Supabase.
- Toda la interfaz va en español de España.
- La URL de vuelta es `Linking.createURL('auth/callback')`.
- El correo se muestra solo en el iPhone y nunca se manda a Foco IA (`ai-context.ts` no se toca).
- Cancelar el navegador no muestra error.
- Al cerrar sesión, los datos se quedan en el iPhone.

## Review Focus

1. **El usuario cierra el navegador sin elegir cuenta:** la app vuelve a su sitio sin mostrar ningún mensaje. Lo cubre el test de `parseAuthCallback` con la URL sin `code` y sin error, que devuelve `cancelled`.
2. **La cuenta de Google ya está vinculada a otro usuario:** la vuelta trae `error_code=identity_already_exists` en la query o en el fragmento, y se ofrece «Entrar con ella». Lo cubren los tests de `parseAuthCallback` con los dos formatos.
3. **«Manual linking» desactivado en Supabase:** la vuelta trae `manual_linking_disabled`. Se avisa al usuario de que falta configurar el acceso, sin cerrar la app. Lo cubre un test de `parseAuthCallback`.
4. **Supabase sin configurar (falta `.env`):** el botón avisa de que todavía no está disponible y la app sigue funcionando sin cuenta. Lo cubre la comprobación manual del Task 4.
5. **Pulsar dos veces el botón mientras se abre el navegador:** solo se abre una sesión. El botón queda desactivado mientras `busy` es true, en los Tasks 4 y 5.

---

### Task 1: Leer la URL de vuelta de Supabase

**Files:**
- Create: `src/services/auth-callback.ts`
- Test: `tests/auth-callback.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type AuthCallback =
    | { kind: 'code'; code: string }
    | { kind: 'cancelled' }
    | { kind: 'identityExists' }
    | { kind: 'linkingDisabled' }
    | { kind: 'error'; message: string };
  parseAuthCallback(url: string): AuthCallback
  ```
- Sin dependencias de Expo: los parámetros se leen tanto de la query (`?`) como del fragmento (`#`).

- [ ] **Step 1: Escribir el test que falla**

  `tests/auth-callback.test.ts`, `describe('parseAuthCallback')`:
  - `parseAuthCallback('foco://auth/callback?code=abc')` → `{ kind: 'code', code: 'abc' }`
  - `parseAuthCallback('exp://192.168.1.2:8081/--/auth/callback?code=abc')` → `{ kind: 'code', code: 'abc' }`
  - `parseAuthCallback('foco://auth/callback?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked')` → `{ kind: 'identityExists' }`
  - `parseAuthCallback('foco://auth/callback#error=invalid_request&error_code=identity_already_exists')` → `{ kind: 'identityExists' }`
  - `parseAuthCallback('foco://auth/callback?error_code=manual_linking_disabled')` → `{ kind: 'linkingDisabled' }`
  - `parseAuthCallback('foco://auth/callback?error=access_denied&error_description=Nope')` → `{ kind: 'error', message: 'Nope' }`
  - `parseAuthCallback('foco://auth/callback')` → `{ kind: 'cancelled' }`

- [ ] **Step 2: Ejecutar `npm run -s test:logic` y comprobar que falla** porque no encuentra el módulo.

- [ ] **Step 3: Implementar `parseAuthCallback`** en `src/services/auth-callback.ts`. Une los parámetros con `URLSearchParams` sobre la parte de query y la de fragmento. Un `error_code` conocido manda sobre `error`.

- [ ] **Step 4: Ejecutar `npm run -s test:logic`.** Esperado: todos pasan.

- [ ] **Step 5: Commit** — `feat: parse the Supabase OAuth callback`

### Task 2: Servicio de Google con vinculación de la sesión anónima

**Files:**
- Modify: `src/services/google-auth.ts`. Reescribir: se quitan `getCallbackCode` y `finishGoogleRedirectCode` si nada más los usa (comprobar con `grep`).

**Interfaces:**
- Consumes: `parseAuthCallback` (Task 1); `supabase` e `isSupabaseConfigured` (`supabase-client.ts`).
- Produces:
  ```ts
  type GoogleSignInResult = 'signedIn' | 'cancelled' | 'identityExists';
  signInWithGoogle(): Promise<GoogleSignInResult>        // vincula si la sesión es anónima
  signInWithExistingGoogle(): Promise<GoogleSignInResult> // entra en la cuenta que ya existe
  signOut(): Promise<void>
  ```
  Los errores se lanzan como `Error` con el mensaje en español:
  - **sin configurar:** «Google estará disponible cuando conectemos Supabase. Puedes seguir sin cuenta.»
  - **linking desactivado:** «Falta activar la vinculación de cuentas en Supabase.»
  - **resto:** «No se pudo iniciar sesión con Google. Inténtalo de nuevo.»

- [ ] **Step 1: Implementar.** Una función privada `runOAuth(getUrl: () => Promise<string | null>)` hace lo común:
  1. Abre `WebBrowser.openAuthSessionAsync(url, redirectTo)`.
  2. Si el resultado no es `success`, devuelve `'cancelled'`.
  3. Si es `success`, pasa la URL a `parseAuthCallback`. Si trae `code`, ejecuta `exchangeCodeForSession` y devuelve `'signedIn'`.

  Las dos funciones públicas solo cambian cómo consiguen la URL:
  - **`signInWithGoogle`:** con una sesión `is_anonymous`, usa `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`. Si no hay sesión, usa `signInWithOAuth`.
  - **`signInWithExistingGoogle`:** usa siempre `signInWithOAuth`, con `queryParams: { prompt: 'select_account' }`.
  - **Web:** se mantiene el `window.location.assign` actual.

- [ ] **Step 2: Comprobar** con `npx tsc --noEmit` y `npx expo lint`. Esperado: sin errores nuevos.

- [ ] **Step 3: Commit** — `feat: Google sign-in links the anonymous session`

### Task 3: Estado de la sesión

**Files:**
- Create: `src/services/use-auth-session.ts`

**Interfaces:**
- Produces: `useAuthSession(): { status: 'loading' | 'none' | 'anonymous' | 'account'; email: string | null }`. Lee `supabase.auth.getSession()` al montarse y escucha `onAuthStateChange`, con limpieza en el desmontaje. El estado es `account` cuando hay sesión y `!session.user.is_anonymous`. El correo sale de `session.user.email`. Sin Supabase configurado devuelve `none`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Comprobar** con `npx tsc --noEmit` y `npx expo lint`.
- [ ] **Step 3: Commit** — `feat: useAuthSession hook`

### Task 4: Botón de Google en la pantalla de entrada

**Files:**
- Modify: `src/app/account.tsx`

**Interfaces:**
- Consumes: `signInWithGoogle` y `signInWithExistingGoogle` (Task 2).

- [ ] **Step 1: Conectar «Continuar con Google».**
  - `onPress`: activa `busy`, desactiva el botón y muestra «Conectando…».
  - **`'signedIn'`:** `router.push('/onboarding')`.
  - **`'identityExists'`:** `Alert` con el título «Esta cuenta de Google ya usa Foco», el mensaje «¿Quieres entrar con ella? Cuando llegue la sincronización podrás elegir qué hacer con los datos de este iPhone.» y los botones Cancelar / «Entrar» (este llama a `signInWithExistingGoogle` y, si va bien, va a `/onboarding`).
  - **`'cancelled'`:** no hace nada.
  - **Errores:** `Alert` con el mensaje del error.
- [ ] **Step 2: Desactivar «Continuar con Apple».** Opacidad 0,5, `accessibilityState={{ disabled: true }}` y el subtítulo «Próximamente». Se borra el comentario «Sign-in arrives in phase 6…».
- [ ] **Step 3: Comprobar** con `npx tsc --noEmit`, `npx expo lint` y `npx expo export --platform ios`.
- [ ] **Step 4: Commit** — `feat: sign in with Google from the welcome flow`

### Task 5: Tarjeta «Cuenta» en Perfil

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`. Una `Surface` nueva justo debajo de la cabecera del perfil.

**Interfaces:**
- Consumes: `useAuthSession` (Task 3); `signInWithGoogle`, `signInWithExistingGoogle` y `signOut` (Task 2).

- [ ] **Step 1: Implementar la tarjeta.**
  - **Título:** «Cuenta».
  - **`account`:** el icono `person.crop.circle.badge.checkmark`, el texto «Has entrado con Google», el `email` debajo en `secondary` y una `ActionButton` plain de color danger con «Cerrar sesión».
  - **Al pulsar «Cerrar sesión»:** `Alert` «¿Cerrar sesión? Tus datos se quedan en este iPhone.» con los botones Cancelar / Cerrar sesión, que llama a `signOut`.
  - **`anonymous` o `none`:** el texto «Tus datos solo están en este iPhone.» y una `ActionButton` «Continuar con Google», con la misma lógica de resultados que el Task 4 pero sin navegar.
  - **`loading`:** no se pinta nada.
- [ ] **Step 2: Comprobar** con `npx tsc --noEmit`, `npx expo lint`, `npm run -s test:logic` y `npx expo export --platform ios`.
- [ ] **Step 3: Commit** — `feat: Cuenta card in Perfil`

### Task 6: Configuración y prueba real (con el usuario)

**Files:** ninguno.

- [ ] **Step 1: Guiar al usuario** paso a paso:
  - **Google Cloud:** proyecto, pantalla de consentimiento y credencial OAuth «Aplicación web», con la URL de vuelta de Supabase: `https://<proyecto>.supabase.co/auth/v1/callback`.
  - **Supabase → Authentication → Providers → Google:** pegar ahí el ID y el secreto de cliente, nunca en el chat.
  - **Supabase → Authentication → Settings:** activar «Allow manual linking».
  - **Supabase → URL Configuration → Redirect URLs:** añadir `foco://auth/callback` y `exp://**/--/auth/callback`.
- [ ] **Step 2: Prueba en el iPhone con Expo Go:**
  1. Sin cuenta, usar la IA (crea la sesión anónima).
  2. Pulsar «Continuar con Google» en Perfil.
  3. Comprobar que la tarjeta muestra el correo.
  4. Comprobar que el cupo de la IA no se ha reiniciado (mismo usuario).
  5. Cerrar sesión.
  6. Pulsar otra vez Google: debe aparecer «Esta cuenta de Google ya usa Foco» y, al pulsar «Entrar», entrar en la cuenta.
