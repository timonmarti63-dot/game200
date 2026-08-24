// Optional cross-device save via Supabase (free tier, no custom server code
// needed - the browser talks to Supabase directly, protected by row-level
// security instead of a secret key). Everything here is a no-op until the
// project is actually configured below, so the game works exactly as
// before (session-only, local registry) if this is never set up.
//
// Setup (see README.md for the full walkthrough):
//   1. Create a free project at https://supabase.com
//   2. Run the SQL from supabase/schema.sql in the project's SQL editor
//   3. Paste the Project URL + anon public key below
//
// Note: this only works on a real deployment (e.g. Vercel). The sandboxed
// Claude Artifact preview blocks requests to external hosts, so cloud login
// will show "not configured" / fail gracefully there even once set up.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_PROJECT_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE';

const SYNCED_KEYS = ['playerState', 'conquered_rubenfeld', 'conquered_eisenklamm', 'conquered_moewenhort'];
const SAVE_DEBOUNCE_MS = 1500;

let client = null;
let saveTimer = null;

export function isConfigured() {
  return SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
}

function getClient() {
  if (!isConfigured()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export async function signUp(email, password) {
  const supabase = getClient();
  if (!supabase) throw new Error('Cloud-Speicher ist nicht konfiguriert.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const supabase = getClient();
  if (!supabase) throw new Error('Cloud-Speicher ist nicht konfiguriert.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const supabase = getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function snapshotRegistry(registry) {
  const out = {};
  SYNCED_KEYS.forEach((key) => {
    const value = registry.get(key);
    if (value !== undefined) out[key] = value;
  });
  return out;
}

export function applyRegistrySnapshot(registry, snapshot) {
  Object.entries(snapshot || {}).forEach(([key, value]) => registry.set(key, value));
}

export async function saveCloud(registry) {
  const supabase = getClient();
  if (!supabase) return;
  const user = await getCurrentUser();
  if (!user) return;
  const payload = snapshotRegistry(registry);
  await supabase
    .from('player_saves')
    .upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
}

export async function loadCloud() {
  const supabase = getClient();
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('player_saves')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.data;
}

// Called after every local save (see PlayerState.js) - coalesces rapid
// changes (e.g. picking up several items in a row) into one network call.
export function scheduleCloudSave(registry) {
  if (!isConfigured()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCloud(registry).catch((err) => console.warn('Cloud-Speicherung fehlgeschlagen:', err.message));
  }, SAVE_DEBOUNCE_MS);
}
