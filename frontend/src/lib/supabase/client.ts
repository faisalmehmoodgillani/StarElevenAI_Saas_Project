import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}