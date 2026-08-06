import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for privileged operations (creating auth users, etc).
// Server-only: never import this from a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
