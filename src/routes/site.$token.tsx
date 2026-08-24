import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navigation, MapPin, ArrowRight } from "lucide-react";
import { ClientOnlyMap } from "@/components/ClientOnlyMap";
import { ROUTE_PALETTE, type BackgroundRoute } from "@/components/RouteMap";
import { supabase, type SavedRoute, type SegmentType } from "@/lib/supabase";

const ROUTE_COLS =
  "id,user_id,name,waypoints,exit_waypoints,route_type,pins,share_token,created_at,expires_at,site,vehicle_type,vehicle_icon";

export const Route = createFileRoute("/site/$token")({
  head: () => ({
    meta: [
      { title: "Site Map — All Routes | LOST" },
      {
        name: "description",
        content: "View every route for this site on one map and follow the one you need.",
      },
      { property: "og:title", content: "Site Map — All Routes | LOST" },
      {
        property: "og:description",
        content: "View every route for this site on one map and follow the one you need.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SiteMapPage,
});

function SiteMapPage() {
  const { token } = Route.useParams();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [siteName, setSiteName] = useState<string>("Site");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: seed } = await supabase
        .from("routes")
        .select(ROUTE_COLS)
        .eq("share_token", token)
        .maybeSingle();
      if (cancelled) return;
      const base = seed as SavedRoute | null;
      if (!base) {
        setNotFound(true);
        return;
      }
      setSiteName((base.site ?? "").trim() || base.name);
      let query = supabase.from("routes").select(ROUTE_COLS).eq("user_id", base.user_id);
      query = base.site ? query.eq("site", base.site) : query.eq("id", base.id);
      const { data } = await query;
      if (cancelled) return;
      const rows = ((data as SavedRoute[]) ?? []).filter(
        (r) => Array.isArray(r.waypoints) && r.waypoints.length > 1,
      );
      setRoutes(rows.length ? rows : [base]);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const vehicleTypes = useMemo(
    () => [...new Set((routes ?? []).map((r) => r.vehicle_type).filter(Boolean) as string[])],
    [routes],
  );

  const visible = useMemo(
    () =>
      (routes ?? []).filter(
        (r) => vehicleFilter === "all" || (r.vehicle_type ?? "") === vehicleFilter,
      ),
    [routes, vehicleFilter],
  );

  const backgroundRoutes: BackgroundRoute[] = visible.map((r, i) => ({
    id: r.id,
    name: r.vehicle_type ? `${r.name} · ${r.vehicle_type}` : r.name,
    color: ROUTE_PALETTE[i % ROUTE_PALETTE.length],
    opacity: selected && selected !== r.id ? 0.25 : 0.85,
    entry: (r.waypoints ?? []).map((w) => [w.lat, w.lng] as [number, number]),
    exit: (r.exit_waypoints ?? []).map((w) => [w.lat, w.lng] as [number, number]),
  }));

  const fitPoints = visible.flatMap((r) =>
    (r.waypoints ?? []).map((w, i) => ({
      id: i + 1,
      lat: w.lat,
      lng: w.lng,
      t: ((w as { t?: SegmentType }).t === "walk" ? "walk" : "drive") as SegmentType,
    })),
  );

  if (notFound) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex flex-col items-center justify-center gap-3 p-6">
        <h1 className="text-xl font-semibold">Site map not found</h1>
        <p className="text-navy-400 text-sm">This link may have been removed.</p>
        <Link to="/" className="text-orange-400 text-sm font-medium">
          Go to LOST
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-navy-900">
      <div className="flex-shrink-0 bg-navy-950 border-b border-navy-800 px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-white font-semibold leading-tight truncate">{siteName}</h1>
          <p className="text-navy-400 text-xs leading-tight">
            {visible.length} route{visible.length === 1 ? "" : "s"} on this site
          </p>
        </div>
        {vehicleTypes.length > 0 && (
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-md bg-navy-800 border border-navy-700 text-white"
          >
            <option value="all">All vehicles</option>
            {vehicleTypes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 relative min-h-0">
        <ClientOnlyMap
          waypoints={fitPoints}
          hideWaypointMarkers
          backgroundRoutes={backgroundRoutes}
          fitToWaypoints
          allowRotation
          onSelectBackgroundRoute={(id) => setSelected(id)}
        />
      </div>

      <div className="flex-shrink-0 max-h-[38vh] overflow-y-auto bg-navy-950 border-t border-navy-800 p-3 space-y-2">
        {(visible ?? []).map((r, i) => (
          <div
            key={r.id}
            onMouseEnter={() => setSelected(r.id)}
            onMouseLeave={() => setSelected(null)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              selected === r.id ? "border-orange-500/60 bg-navy-800" : "border-navy-800 bg-navy-900"
            }`}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: ROUTE_PALETTE[i % ROUTE_PALETTE.length] }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{r.name}</p>
              <p className="text-navy-400 text-xs flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {r.waypoints?.length ?? 0} pts
                {r.vehicle_type && <span className="text-orange-300">{r.vehicle_type}</span>}
              </p>
            </div>
            <Link
              to="/route/$token"
              params={{ token: r.share_token }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              Follow <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
