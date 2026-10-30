export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'cancelled' }
  | { kind: 'identityExists' }
  | { kind: 'linkingDisabled' }
  | { kind: 'error'; message: string };

/**
 * Reads the URL Supabase sends back after Google: a PKCE code, or an error. Errors may arrive in
 * the query or in the fragment depending on the flow, so both are read; a known error_code wins
 * over the generic `error`.
 */
export function parseAuthCallback(url: string): AuthCallback {
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  const errorCode = params.get('error_code');
  if (errorCode === 'identity_already_exists') return { kind: 'identityExists' };
  if (errorCode === 'manual_linking_disabled') return { kind: 'linkingDisabled' };
  // «Cancel» on Google's own consent page: the student backed out, so no error is shown.
  if (params.get('error') === 'access_denied') return { kind: 'cancelled' };
  if (params.get('error') || errorCode) {
    return { kind: 'error', message: params.get('error_description') ?? params.get('error') ?? errorCode ?? '' };
  }
  const code = params.get('code');
  return code ? { kind: 'code', code } : { kind: 'cancelled' };
}
