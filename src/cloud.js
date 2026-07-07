// Optional cloud sync (Supabase).
//
// This whole module is INERT until two build-time env vars are provided:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// With neither set (the default), cloudConfigured() is false and none of this
// code runs — the app behaves exactly as the local-only version. See
// docs/CLOUD_SETUP.md for how to turn it on.
//
// Model mirrors the app's existing design: the entire app state is one JSON
// blob, stored as a single row per signed-in user (last-write-wins). The
// Supabase client is loaded with a dynamic import so it never lands in the
// default bundle when cloud sync is off.

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = "panelpro_state";

export function cloudConfigured() {
  return Boolean(URL_ && ANON);
}

let clientPromise = null;
async function client() {
  if (!cloudConfigured()) return null;
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: true } }))
      .catch(() => null);
  }
  return clientPromise;
}

// ---- auth -----------------------------------------------------------------

// Sends a magic-link / one-time-code email. Returns { ok, error }.
export async function signInWithEmail(email) {
  const c = await client();
  if (!c) return { ok: false, error: "Cloud sync not configured" };
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
  return { ok: !error, error: error ? error.message : null };
}

export async function signOut() {
  const c = await client();
  if (c) await c.auth.signOut();
}

// Current signed-in user (or null). Safe to call when unconfigured.
export async function currentUser() {
  const c = await client();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data ? data.user : null;
}

// Subscribe to sign-in / sign-out. Returns an unsubscribe function.
export async function onAuthChange(cb) {
  const c = await client();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session ? session.user : null));
  return () => { try { data.subscription.unsubscribe(); } catch (_) {} };
}

// ---- state sync -----------------------------------------------------------

// Returns { state, updatedAt } for the signed-in user, or null if none / error.
export async function pullState() {
  const c = await client();
  if (!c) return null;
  const u = await currentUser();
  if (!u) return null;
  const { data, error } = await c.from(TABLE).select("state, updated_at").eq("user_id", u.id).maybeSingle();
  if (error || !data) return null;
  return { state: data.state, updatedAt: data.updated_at };
}

// Upserts the whole state blob for the signed-in user. Returns true on success.
export async function pushState(state) {
  const c = await client();
  if (!c) return false;
  const u = await currentUser();
  if (!u) return false;
  const { error } = await c.from(TABLE).upsert(
    { user_id: u.id, state, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  return !error;
}
