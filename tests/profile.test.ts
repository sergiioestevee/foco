import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { avatars } from '@/features/profile/avatars';
import { normalizeProfile } from '@/features/profile/normalize-profile';

describe('normalizeProfile', () => {
  test('keeps a known avatar and age check', () => {
    const profile = normalizeProfile({ name: 'Ana', studies: '', focusTime: null, classTime: null, avatar: 'fox', ageCheck: 'parentalConsent' });
    assert.equal(profile?.avatar, 'fox');
    assert.equal(profile?.ageCheck, 'parentalConsent');
  });

  test('older profiles have no avatar and an unconfirmed age', () => {
    const profile = normalizeProfile({ name: 'Ana', studies: 'Bachillerato', focusTime: 'afternoon' });
    assert.equal(profile?.avatar, null);
    assert.equal(profile?.ageCheck, null);
  });

  test('unknown values are dropped', () => {
    const profile = normalizeProfile({ name: 'Ana', avatar: 'dragon', ageCheck: 'yes' });
    assert.equal(profile?.avatar, null);
    assert.equal(profile?.ageCheck, null);
  });
});

describe('avatars', () => {
  test('ids are unique', () => {
    assert.equal(new Set(avatars.map((avatar) => avatar.id)).size, avatars.length);
  });
});
