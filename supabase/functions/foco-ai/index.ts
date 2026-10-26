// Foco IA: the only place that talks to the model provider. Provider keys live in Edge Function
// secrets (GROQ_API_KEY or GEMINI_API_KEY) and never reach the app. Runs on Supabase Edge Functions (Deno).
import { createSupabaseContext } from 'npm:@supabase/server@1';

import {
  buildInput,
  extractText,
  parseRequest,
  RESPONSE_SCHEMA,
  sanitizeReply,
  SYSTEM_INSTRUCTION,
  type FocoRequest,
} from './logic.ts';

/** 0 turns the quota off (for testing): `supabase secrets set FOCO_AI_DAILY_LIMIT=0`; unset it to go back to 30. */
const DAILY_LIMIT = Number(Deno.env.get('FOCO_AI_DAILY_LIMIT') ?? '30');
const QUOTA_ENABLED = DAILY_LIMIT > 0;
/** "groq" (default, free plan without a card) or "gemini". */
const PROVIDER = Deno.env.get('AI_PROVIDER') ?? 'groq';

const providers = {
  groq: {
    keyName: 'GROQ_API_KEY',
    request: (apiKey: string, input: string) => fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: input },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'foco_reply', strict: true, schema: RESPONSE_SCHEMA } },
      }),
    }),
  },
  gemini: {
    keyName: 'GEMINI_API_KEY',
    request: (apiKey: string, input: string) => fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash',
        system_instruction: SYSTEM_INSTRUCTION,
        input,
        // Don't keep the conversation on Google's side; the app stores the history.
        store: false,
        response_format: { type: 'text', mime_type: 'application/json', schema: RESPONSE_SCHEMA },
      }),
    }),
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export default {
  fetch: async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const { data: ctx, error: authError } = await createSupabaseContext(req, { auth: 'user' });
    if (authError || !ctx) return json({ error: 'unauthorized' }, 401);

    const provider = providers[PROVIDER as keyof typeof providers];
    const apiKey = provider ? Deno.env.get(provider.keyName) : undefined;
    if (!provider || !apiKey) return json({ error: 'not_configured' }, 503);

    let request: FocoRequest;
    try {
      request = parseRequest(await req.json());
    } catch {
      return json({ error: 'invalid_request' }, 400);
    }

    if (QUOTA_ENABLED) {
      const { data: allowed, error: quotaError } = await ctx.supabase.rpc('consume_ai_quota', { p_limit: DAILY_LIMIT });
      if (quotaError) {
        console.error('consume_ai_quota failed', quotaError.message);
        return json({ error: 'quota_check_failed' }, 500);
      }
      if (!allowed) return json({ error: 'daily_limit', limit: DAILY_LIMIT }, 429);
    }

    // A failure on our side or the provider's shouldn't cost the student a message.
    const refund = async () => {
      if (!QUOTA_ENABLED) return;
      const userId = ctx.userClaims?.id;
      if (!userId) return;
      const { error } = await ctx.supabaseAdmin.rpc('refund_ai_quota', { p_user: userId });
      if (error) console.error('refund_ai_quota failed', error.message);
    };

    let response: Response;
    try {
      response = await provider.request(apiKey, buildInput(request));
    } catch (error) {
      console.error(`${PROVIDER} unreachable`, error instanceof Error ? error.message : 'unknown');
      await refund();
      return json({ error: 'busy' }, 503);
    }
    if (response.status === 429) {
      await refund();
      return json({ error: 'busy' }, 503);
    }
    if (!response.ok) {
      // Log only the status and the provider's error, never the student's data.
      console.error(`${PROVIDER} request failed`, response.status, (await response.text()).slice(0, 500));
      await refund();
      return json({ error: 'ai_failed' }, 502);
    }

    try {
      const reply = sanitizeReply(JSON.parse(extractText(await response.json())), request.context.today);
      return json(reply);
    } catch (error) {
      console.error('Unusable model output', error instanceof Error ? error.message : 'unknown');
      await refund();
      return json({ error: 'ai_failed' }, 502);
    }
  },
};
