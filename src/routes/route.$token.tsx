import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navigation, MapPin } from "lucide-react";
import { ClientOnlyMap } from "@/components/RouteMap";
import { supabase, type SavedRoute } from "@/lib/supabase";

export const Route = createFileRoute("/route/$token")({
  head: () => ({ meta: [{ title: "Follow Route — SiteNav" }] }),
  component: FollowerPage,
});

function FollowerPage() {
  const { token } = Route.useParams();
  const [route, setRoute] = useState<SavedRoute | null | "missing">("missing");
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("routes")
      .select("id,user_id,name,waypoints,share_token,created_at")
      .eq("share_token", token)
      .maybeSingle()
      .then(({ data }) => {
        setRoute((data as SavedRoute) ?? "missing");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoError(null);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (loading) {
    return <div className="h-screen bg-navy-900" />;
  }

  if (route === "missing" || !route) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <MapPin className="w-10 h-10 text-navy-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold mb-1">Route not found</h1>
          <p className="text-navy-400 text-sm mb-6">
            This link may have expired or been deleted.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const waypoints = (route.waypoints || []).map((w, i) => ({ id: i + 1, lat: w.lat, lng: w.lng }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-navy-950 border-b border-navy-800 px-4 py-2.5 z-50 flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-white font-semibold leading-tight truncate">{route.name}</h1>
          <p className="text-navy-400 text-xs leading-tight">
            {waypoints.length} waypoints
            {pos ? " • Live GPS active" : geoError ? ` • ${geoError}` : " • Waiting for GPS…"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-navy-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> You
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <ClientOnlyMap waypoints={waypoints} gpsPosition={pos} fitToWaypoints />
      </div>
    </div>
  );
}