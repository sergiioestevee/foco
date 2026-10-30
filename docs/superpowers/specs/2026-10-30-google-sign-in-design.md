# Inicio de sesión con Google (fase 6, pieza 1)

## Para qué

Que el progreso del estudiante quede asociado a su cuenta de Google y no a una sesión anónima que se pierde si borra la app o cambia de móvil. Esta pieza solo da la identidad. Guardar y recuperar los datos en la nube es la pieza 2 (sincronización), que va justo después.

## Objetivos

- **«Continuar con Google»** funciona en la pantalla «¿Dónde guardamos tu progreso?» y desde Perfil.
- **Quien ya usaba Foco sin cuenta** conserva su usuario de Supabase: la sesión anónima se **vincula** a Google. Mantiene el mismo id, su cupo de IA y sus datos.
- **En Perfil** se ve con qué cuenta has entrado y se puede **cerrar sesión**.

## No objetivos (por ahora)

- **Apple:** el código se deja preparado, pero el botón no se activa hasta tener la cuenta de Apple Developer.
- **Sincronizar datos:** es la pieza 2. Requisito ya acordado para ella: sin conexión todo sigue funcionando y se guarda en el iPhone; cuando vuelve la conexión (o al abrir la app) se sube a la nube lo que quedó pendiente en local. Y si entras en una cuenta que ya tiene datos de otro dispositivo, la app pregunta qué hacer: **Combinar**, **Quedarme con lo de la nube** (borra lo de este iPhone) o **Quedarme con lo de este iPhone** (sustituye lo de la nube).
- **Borrar la cuenta:** es la pieza 3.
- **Política de privacidad:** es la pieza 4.
- **Android:** el mismo flujo valdrá allí, pero se hará después.

## Antiobjetivos

- Perder datos al iniciar sesión.
- Pedir claves o secretos en el chat.
- Meter secretos en la app: el ID y el secreto de cliente de Google van solo en el panel de Supabase.

## Enfoques

- **A. Navegador vía Supabase (OAuth + PKCE)**, elegido por el usuario. Ya existe `src/services/google-auth.ts`, no requiere librerías nuevas, funciona en Expo Go y en Android, y permite vincular la sesión anónima con `linkIdentity`. Pega: iOS muestra «Foco quiere usar supabase.co para iniciar sesión».
- **B. Selector nativo de Google** (`@react-native-google-signin` + `signInWithIdToken`). Queda más bonito, pero necesita una dependencia nueva y development build, y vincular la sesión anónima es más delicado. Descartado por ahora; se puede cambiar más adelante sin tocar el resto.

## Cómo funciona

**1. Pulsar «Continuar con Google».**
- **Si hay sesión anónima:** `supabase.auth.linkIdentity({ provider: 'google' })`, con `redirectTo = Linking.createURL('auth/callback')` y `skipBrowserRedirect`.
- **Si no hay sesión:** `signInWithOAuth`.
- En los dos casos, el enlace se abre con `WebBrowser.openAuthSessionAsync` y, a la vuelta, se cambia el `code` por la sesión (`exchangeCodeForSession`).

**2. Esa cuenta de Google ya está en Foco** (por ejemplo, en otro móvil). `linkIdentity` falla con «identity already exists». Entonces la app pregunta «Esta cuenta de Google ya usa Foco. ¿Entrar con ella?» y, si aceptas, hace `signInWithOAuth`. Los datos de este iPhone siguen en el iPhone. Unirlos con los de la cuenta es tarea de la pieza 2.

**3. Al terminar.**
- **Desde la pantalla de entrada:** continúa a la configuración inicial, como «Usar sin cuenta».
- **Desde Perfil:** vuelve a Perfil.

**4. Si cancelas o falla.** Mensaje claro en español y te quedas donde estabas. Cancelar no muestra error.

**5. Perfil, tarjeta «Cuenta».**
- **Sin cuenta:** «Tus datos solo están en este iPhone» y el botón «Continuar con Google».
- **Con cuenta:** el correo de Google y «Cerrar sesión». Ese correo solo se muestra en el iPhone y no se manda a la IA.

**6. Cerrar sesión.** `signOut`. Los datos se quedan en el iPhone *(decisión mía, a revisar en la pieza 2, cuando haya nube)*. La próxima vez que uses la IA se crea una sesión anónima nueva, como ahora.

**7. Estado de la sesión.** Un hook pequeño (`useAuthSession`) que escucha `onAuthStateChange` y dice si eres anónimo o tienes cuenta, y con qué correo.

## Lo que tiene que configurar el usuario (te guío paso a paso)

**Google Cloud:**
- Crear un proyecto.
- Configurar la pantalla de consentimiento.
- Crear credenciales OAuth de tipo «Aplicación web», con la URL de vuelta que da Supabase.

**Supabase (Authentication):**
- Activar el proveedor Google y pegar ahí el ID y el secreto de cliente.
- Activar «Manual linking» para que funcione `linkIdentity`.
- Añadir a «Redirect URLs» `foco://auth/callback` y la dirección de Expo Go (`exp://…/--/auth/callback`).

## Lo que queda para quien lo construya

- Los textos exactos.
- Cómo distinguir el error «identity already exists» de los demás.
- Probar el flujo en Expo Go con una cuenta real de Google.
