import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const APP_ORIGIN = 'https://tausifdg-cmyk.github.io';
const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin'
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function secretKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') as Record<string, string>;
    return keys.default || Object.values(keys)[0] || '';
  } catch {
    return '';
  }
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requestPayload(request: Request) {
  const url = new URL(request.url);
  const queryPayload: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  if (request.method === 'GET') return queryPayload;
  try {
    const json = await request.json();
    return { ...queryPayload, ...(json && typeof json === 'object' ? json : {}) } as Record<string, unknown>;
  } catch {
    return queryPayload;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!['GET', 'POST'].includes(request.method)) return response({ error: 'Method not allowed' }, 405);

  const origin = request.headers.get('origin');
  if (origin && origin !== APP_ORIGIN) return response({ error: 'Origin not allowed' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 4096) return response({ error: 'Request too large' }, 413);

  const payload = await requestPayload(request);
  const token = String(payload.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return response({ error: 'Invalid sync token' }, 401);

  const hasSteps = payload.steps !== undefined && payload.steps !== null && String(payload.steps).trim() !== '';
  const action = String(payload.action || (hasSteps ? 'write' : 'read')).toLowerCase();
  if (!['read', 'write'].includes(action)) return response({ error: 'Invalid action' }, 400);

  const key = secretKey();
  const url = Deno.env.get('SUPABASE_URL') || '';
  if (!key || !url) return response({ error: 'Sync service is not configured' }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = await hashToken(token);

  if (action === 'write') {
    const steps = Math.round(Number(String(payload.steps ?? '').replace(/,/g, '')));
    const date = String(payload.date || new Date().toISOString().slice(0, 10));
    if (!Number.isFinite(steps) || steps < 0 || steps > 200000) return response({ error: 'Invalid step total' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return response({ error: 'Invalid date' }, 400);
    const updatedAt = new Date().toISOString();
    const { error } = await admin.from('ios_step_sync').upsert({
      token_hash: tokenHash,
      steps,
      step_date: date,
      updated_at: updatedAt
    }, { onConflict: 'token_hash' });
    if (error) return response({ error: 'Could not save step total' }, 500);
    return response({ ok: true, action: 'write', steps, date, updatedAt });
  }

  const { data, error } = await admin
    .from('ios_step_sync')
    .select('steps,step_date,updated_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) return response({ error: 'Could not retrieve step total' }, 500);
  if (!data) return response({ ok: true, action: 'read', found: false });
  return response({
    ok: true,
    action: 'read',
    found: true,
    steps: data.steps,
    date: data.step_date,
    updatedAt: data.updated_at
  });
});
