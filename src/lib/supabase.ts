import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jykjsyeljtdaincnvwja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5a2pzeWVsanRkYWluY252d2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDAyNTksImV4cCI6MjA5NjMxNjI1OX0.K9Hj_NiBoUKbiMcSP-yVzScXY2S5Kdxcf9ORSMo0iB4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

import type { Pin } from "./pins";

export type SavedRoute = {
  id: string;
  user_id: string;
  name: string;
  waypoints: { lat: number; lng: number }[];
  pins?: Pin[] | null;
  share_token: string;
  created_at: string;
};