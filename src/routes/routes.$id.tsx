import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Navigation, Crosshair } from "lucide-react";
import { ClientOnlyMap } from "@/components/ClientOnlyMap";
import { supabase, type SavedRoute, normalizeRouteType } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Pin } from "@/lib/pins";
import type { SegmentPoint, SegmentType } from "@/lib/supabase";

export const Route = createFileRoute("/routes/$id")({
  head: () => ({ meta: [{ title: "Route — SiteNav" }] }),
  component: OwnerRouteView,
});

function OwnerRouteView() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [route, setRoute] = useState<SavedRoute | null | "missing">(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [followGps, setFollowGps] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number; seq: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("routes")
      .select("id,user_id,name,waypoints,exit_waypoints,route_type,pins,share_token,created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRoute((data as SavedRoute) ?? "missing"));
  }, [id, user]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (authLoading || !user || route === null) {
    return <div className="h-screen bg-navy-900" />;
  }

  if (route === "missing") {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-1">Route not found</h1>
          <p className="text-navy-400 text-sm mb-6">
            This route may have been deleted or doesn't belong to you.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const routeType = normalizeRouteType(route.route_type);
  const waypoints = (route.waypoints || []).map((w, i) => ({ id: i + 1, lat: w.lat, lng: w.lng }));
  const exitWaypoints = (route.exit_waypoints || []).map((w, i) => ({
    id: waypoints.length + i + 1,
    lat: w.lat,
    lng: w.lng,
  }));
  const mmPoints: SegmentPoint[] =
    routeType === "multi_movement"
      ? ((route.waypoints || []) as SegmentPoint[]).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          t: ((p as { t?: SegmentType }).t ?? "drive") as SegmentType,
        }))
      : [];
  const pins: Pin[] = (route.pins || []).filter((p): p is Pin => !!p && typeof p.lat === "number");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-navy-950 border-b border-navy-800 px-3 py-2.5 z-50 flex items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-200 hover:text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Dashboard</span>
        </Link>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold leading-tight truncate">{route.name}</h1>
            <p className="text-navy-400 text-xs leading-tight">
              {waypoints.length} waypoints
              {pins.length ? ` • ${pins.length} pin${pins.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <Link
          to="/creator"
          search={{ edit: route.id }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden xs:inline">Edit</span>
        </Link>
      </div>

      <div className="flex-1 relative min-h-0">
        <ClientOnlyMap
          waypoints={waypoints}
          exitWaypoints={exitWaypoints}
          routeType={routeType}
          multiMovementPoints={mmPoints}
          pins={pins}
          gpsPosition={pos}
          fitToWaypoints={!followGps}
          followGps={followGps}
          flyTo={flyTarget}
        />
        <button
          onClick={() => {
            if (!pos) return;
            setFollowGps(true);
            setFlyTarget({ lat: pos.lat, lng: pos.lng, zoom: 17, seq: Date.now() });
          }}
          disabled={!pos}
          className={`absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-full shadow-lg backdrop-blur-sm border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
            pos ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-400" : "bg-navy-950/90 text-navy-400 border-navy-700"
          }`}
          title="Center on my location"
        >
          <Crosshair className="w-4 h-4" /> Go to My Location
        </button>
      </div>
    </div>
  );
}