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

// Two route types:
//   two_way — one drawn path, used in both directions (In + Out arrows on the
//             same line).
//   one_way — entry and exit are two separate paths.
export type RouteType = "two_way" | "one_way";
// Legacy stored values needing coercion: "multi_movement", "two_route".
export type StoredRouteType = RouteType | "multi_movement" | "two_route";

export function normalizeRouteType(t: string | null | undefined): RouteType {
  if (t === "one_way" || t === "two_route") return "one_way";
  // "two_way", "multi_movement", null/undefined, and anything else → two_way.
  return "two_way";
}

// Per-waypoint movement type. Stored on every waypoint going forward.
export type SegmentType = "drive" | "walk";

export type SegmentPoint = { lat: number; lng: number; t?: SegmentType };

export type StoredWaypoint = { lat: number; lng: number; t?: SegmentType };

export type SavedRoute = {
  id: string;
  user_id: string;
  name: string;
  waypoints: StoredWaypoint[];
  exit_waypoints?: StoredWaypoint[] | null;
  route_type?: RouteType | null;
  pins?: Pin[] | null;
  share_token: string;
  created_at: string;
  expires_at?: string | null;
};