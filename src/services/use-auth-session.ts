import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/services/supabase-client';

export type AuthStatus = 'loading' | 'none' | 'anonymous' | 'account';

function describe(session: Session | null): { status: AuthStatus; email: string | null } {
  if (!session) return { status: 'none', email: null };
  if (session.user.is_anonymous) return { status: 'anonymous', email: null };
  return { status: 'account', email: session.user.email ?? null };
}

/** Whether the student uses Foco without an account, anonymously, or signed in (and with which email). */
export function useAuthSession(): { status: AuthStatus; email: string | null } {
  const [state, setState] = useState<{ status: AuthStatus; email: string | null }>(() => (supabase
    ? { status: 'loading', email: null }
    : { status: 'none', email: null }));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState(describe(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState(describe(session)));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
