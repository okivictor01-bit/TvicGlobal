import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars at request time: " +
        `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? "set" : "MISSING"}, ` +
        `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey ? "set" : "MISSING"}`
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}

// Proxy so existing `supabaseAdmin.from(...)` call sites keep working unchanged,
// while the underlying client is only constructed on first actual use (request time).
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    return Reflect.get(client as object, prop, receiver);
  },
});
