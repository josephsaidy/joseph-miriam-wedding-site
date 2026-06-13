import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are not set. RSVP features will not work.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export type RSVPStatus = "pending" | "attending" | "not_attending";

export interface GuestAlias {
  id: string;
  guest_id: string;
  alias: string;
  normalized_alias: string;
}

export interface Guest {
  id: string;
  full_name: string;
  normalized_name: string;
  party_name: string | null;
  allowed_guests: number;
  rsvp_status: RSVPStatus;
  attending_count: number | null;
  guest_message: string | null;
  dietary_restrictions: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}
