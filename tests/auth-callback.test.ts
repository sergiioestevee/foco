import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseAuthCallback } from '@/services/auth-callback';

describe('parseAuthCallback', () => {
  test('a code comes back from the app scheme', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback?code=abc'), { kind: 'code', code: 'abc' });
  });

  test('a code comes back from Expo Go', () => {
    assert.deepEqual(parseAuthCallback('exp://192.168.1.2:8081/--/auth/callback?code=abc'), { kind: 'code', code: 'abc' });
  });

  test('a Google account already used by someone else, in the query', () => {
    const url = 'foco://auth/callback?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked';
    assert.deepEqual(parseAuthCallback(url), { kind: 'identityExists' });
  });

  test('a Google account already used by someone else, in the fragment', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback#error=invalid_request&error_code=identity_already_exists'), { kind: 'identityExists' });
  });

  test('manual linking switched off in Supabase', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback?error_code=manual_linking_disabled'), { kind: 'linkingDisabled' });
  });

  test('cancelling on Google\'s consent page counts as cancelled, not an error', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback?error=access_denied&error_description=The+user+denied'), { kind: 'cancelled' });
  });

  test('any other error keeps its description', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback?error=server_error&error_description=Nope'), { kind: 'error', message: 'Nope' });
  });

  test('neither a code nor an error means it was cancelled', () => {
    assert.deepEqual(parseAuthCallback('foco://auth/callback'), { kind: 'cancelled' });
  });
});
