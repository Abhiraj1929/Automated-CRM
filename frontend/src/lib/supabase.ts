// ============================================================
// Supabase Client - Kept for reference but not used in production
// All API calls go through the backend Express server
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// @ts-ignore - Direct Supabase client for potential future use
export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
