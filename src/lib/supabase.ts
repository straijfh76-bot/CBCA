const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const API_BASE = `${supabaseUrl}/functions/v1/cbca-api`;

export function apiHeaders(token?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token || supabaseAnonKey}`,
  };
}
