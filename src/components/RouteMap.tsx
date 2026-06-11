import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";
import { type Pin, PIN_COLORS } from "@/lib/pins";
import { type SegmentType, type RouteType } from "@/lib/supabase";

export interface Waypoint {
  id: number;
  lat: number;
  lng: number;
  t?: SegmentType; // "drive" | "walk"
}

const ENTRY_COLOR = "#f97316";
const EXIT_COLOR = "#ef4444";
const REVERSE_COLOR = "#3b82f6";
const BG_COLOR = "#3b82f6";
const WALK_COLOR = "#22c55e"; // green for walk segments (both legs)

function segmentColor(t: SegmentType | undefined, leg: "entry" | "exit"): string {
  if (t === "walk") return WALK_COLOR;
  return leg === "exit" ? REVERSE_COLOR : ENTRY_COLOR;
}

function createMarkerIcon(
  type: "first" | "last" | "middle",
  variant: "entry" | "exit" = "entry",
) {
  const base =
    type === "first" ? "route-marker-first" : type === "last" ? "route-marker-last" : "route-marker";
  const className = variant === "exit" ? `${base} route-marker-exit` : base;
  // iconSize / iconAnchor must match the rendered CSS box, otherwise the
  // marker is anchored to the corner of a larger invisible box and appears
  // offset from the polyline. Middle dots are 8x8, first/last are 18x18
  // (matches src/styles.css `.route-marker*`). Anchors are exact centres.
  return L.divIcon({
    className,
    iconSize: type === "middle" ? [8, 8] : [18, 18],
    iconAnchor: type === "middle" ? [4, 4] : [9, 9],
  });
}

function createGpsIcon() {
  return L.divIcon({
    className: "gps-marker",
    html: '<span class="gps-pulse"></span><span class="gps-dot"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createPinIcon(color: string) {
  return L.divIcon({
    className: "pin-marker",
    html: `<span class="pin-dot" style="background:${color}"></span>`,
    iconSize: [22, 28],
    iconAnchor: [11, 26],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

function FitToBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    fittedRef.current = true;
  }, [map, points]);
  return null;
}

function FollowGps({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      map.setView([position.lat, position.lng], 17, { animate: true });
      firstRef.current = false;
    } else {
      map.panTo([position.lat, position.lng], { animate: true });
    }
  }, [map, position.lat, position.lng]);
  return null;
}

function DirectionArrows({
  points,
  color,
  opacity,
  reverse,
}: {
  points: [number, number][];
  color: string;
  opacity: number;
  reverse: boolean;
}) {
  const map = useMap();
  const key =
    points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join("|") +
    `|${color}|${opacity}|${reverse}`;
  useEffect(() => {
    if (points.length < 2) return;
    const pts = reverse ? [...points].reverse() : points;
    const decorator = (L as unknown as {
      polylineDecorator: (line: L.Polyline, opts: unknown) => L.Layer;
    }).polylineDecorator(L.polyline(pts), {
      patterns: [
        {
          offset: 30,
          repeat: 80,
          symbol: (L as unknown as { Symbol: { arrowHead: (o: unknown) => unknown } }).Symbol.arrowHead({
            pixelSize: 12,
            polygon: false,
            pathOptions: { stroke: true, color, weight: 3, opacity },
          }),
        },
      ],
    });
    decorator.addTo(map);
    return () => {
      map.removeLayer(decorator);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function smoothPath(pts: [number, number][], segments = 16): [number, number][] {
  if (pts.length < 3) return pts;
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      out.push([
        catmullRom(p0[0], p1[0], p2[0], p3[0], t),
        catmullRom(p0[1], p1[1], p2[1], p3[1], t),
      ]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

function FlyTo({ target }: { target: { lat: number; lng: number; zoom?: number; seq: number } | null }) {
  const map = useMap();
  const lastSeq = useRef(-1);
  useEffect(() => {
    if (!target || target.seq === lastSeq.current) return;
    lastSeq.current = target.seq;
    map.flyTo([target.lat, target.lng], target.zoom ?? map.getZoom(), { duration: 1.2 });
  }, [map, target]);
  return null;
}

export type BackgroundRoute = {
  id: string;
  name?: string;
  entry: [number, number][];
  exit?: [number, number][];
  routeType?: RouteType;
};

function routeBounds(r: BackgroundRoute) {
  const pts = [...r.entry, ...(r.exit ?? [])];
  if (pts.length === 0) return null;
  let minLat = pts[0][0], maxLat = pts[0][0], minLng = pts[0][1], maxLng = pts[0][1];
  for (const [la, ln] of pts) {
    if (la < minLat) minLat = la;
    if (la > maxLat) maxLat = la;
    if (ln < minLng) minLng = ln;
    if (ln > maxLng) maxLng = ln;
  }
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
}

function BackgroundRoutes({ routes }: { routes: BackgroundRoute[] }) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(() => {
    try { return map.getBounds(); } catch { return null; }
  });
  useMapEvents({
    moveend: () => setBounds(map.getBounds()),
    zoomend: () => setBounds(map.getBounds()),
  });
  const useViewport = routes.length > 50;
  const visible = routes.filter((r) => {
    if (!useViewport || !bounds) return true;
    const b = routeBounds(r);
    return b ? bounds.intersects(b) : false;
  });
  return (
    <>
      {visible.map((r) => {
        const entry = smoothPath(r.entry);
        const exit = r.exit ? smoothPath(r.exit) : [];
        return (
          <Fragment key={r.id}>
            {entry.length > 1 && (
              <Polyline
                positions={entry}
                pathOptions={{
                  color: BG_COLOR,
                  weight: 6,
                  opacity: 0.3,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                {r.name && (
                  <Tooltip sticky direction="top" opacity={1} className="bg-route-tooltip">
                    {r.name}
                  </Tooltip>
                )}
              </Polyline>
            )}
            {exit.length > 1 && (
              <Polyline
                positions={exit}
                pathOptions={{
                  color: BG_COLOR,
                  weight: 6,
                  opacity: 0.3,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                {r.name && (
                  <Tooltip sticky direction="top" opacity={1} className="bg-route-tooltip">
                    {r.name}
                  </Tooltip>
                )}
              </Polyline>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export type RouteMapProps = {
  waypoints: Waypoint[];
  exitWaypoints?: Waypoint[];
  routeType?: RouteType;
  activeDirection?: "in" | "out";
  onAddWaypoint?: (lat: number, lng: number) => void;
  onAddPin?: (lat: number, lng: number) => void;
  pins?: Pin[];
  pinMode?: boolean;
  gpsPosition?: { lat: number; lng: number } | null;
  fitToWaypoints?: boolean;
  followGps?: boolean;
  flyTo?: { lat: number; lng: number; zoom?: number; seq: number } | null;
  backgroundRoutes?: BackgroundRoute[];
  hideWaypointMarkers?: boolean;
  editMode?: boolean;
  editTool?: "move" | "erase" | "add";
  onMoveWaypoint?: (leg: "entry" | "exit", id: number, lat: number, lng: number) => void;
  onDeleteWaypoint?: (leg: "entry" | "exit", id: number) => void;
  onInsertWaypoint?: (leg: "entry" | "exit", afterIndex: number, lat: number, lng: number) => void;
};

export default function RouteMap({
  waypoints,
  exitWaypoints = [],
  routeType = "two_way",
  activeDirection = "in",
  onAddWaypoint,
  onAddPin,
  pins = [],
  pinMode = false,
  gpsPosition,
  fitToWaypoints = false,
  followGps = false,
  flyTo = null,
  backgroundRoutes,
  hideWaypointMarkers = false,
  editMode = false,
  editTool = "move",
  onMoveWaypoint,
  onDeleteWaypoint,
  onInsertWaypoint,
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (editMode) return;
      if (pinMode) onAddPin?.(e.latlng.lat, e.latlng.lng);
      else onAddWaypoint?.(e.latlng.lat, e.latlng.lng);
    },
    [onAddPin, onAddWaypoint, pinMode, editMode],
  );
  const entryRaw = waypoints.map((w) => [w.lat, w.lng] as [number, number]);
  const exitRaw = exitWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
  const rawPoints = [...entryRaw, ...exitRaw];
  const clickable = Boolean(onAddWaypoint || onAddPin);
  const dim = 0.3;
  const bright = 0.95;

  // Build connected sub-polylines by movement type (`t`). Segment i covers the
  // line from waypoint[i-1] → waypoint[i] and adopts waypoint[i]'s `t`.
  type LegSeg = { type: SegmentType; pts: [number, number][] };
  function buildLegSegments(wps: Waypoint[]): LegSeg[] {
    const out: LegSeg[] = [];
    if (wps.length < 2) return out;
    let cur: LegSeg | null = null;
    for (let i = 1; i < wps.length; i++) {
      const t: SegmentType = wps[i].t === "walk" ? "walk" : "drive";
      if (!cur || cur.type !== t) {
        cur = { type: t, pts: [[wps[i - 1].lat, wps[i - 1].lng], [wps[i].lat, wps[i].lng]] };
        out.push(cur);
      } else {
        cur.pts.push([wps[i].lat, wps[i].lng]);
      }
    }
    return out;
  }
  const entrySegs = buildLegSegments(waypoints);
  const exitSegs = buildLegSegments(exitWaypoints);

  const insertOnLine = (leg: "entry" | "exit", raw: [number, number][], e: L.LeafletMouseEvent) => {
    if (!onInsertWaypoint || raw.length < 2) return;
    const click = e.latlng;
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < raw.length - 1; i++) {
      const a = L.latLng(raw[i][0], raw[i][1]);
      const b = L.latLng(raw[i + 1][0], raw[i + 1][1]);
      const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
      const d = click.distanceTo(mid);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    onInsertWaypoint(leg, bestI, click.lat, click.lng);
  };

  return (
    <MapContainer
      ref={mapRef}
      center={[-25.2744, 133.7751]}
      zoom={5}
      scrollWheelZoom
      zoomControl
      className={`absolute inset-0 w-full h-full ${pinMode ? "cursor-pin" : ""}`}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={20}
        maxNativeZoom={19}
      />
      {clickable && <MapClickHandler onMapClick={handleClick} />}
      {fitToWaypoints && rawPoints.length > 0 && <FitToBounds points={rawPoints} />}
      {followGps && gpsPosition && <FollowGps position={gpsPosition} />}
      <FlyTo target={flyTo} />
      {backgroundRoutes && backgroundRoutes.length > 0 && (
        <BackgroundRoutes routes={backgroundRoutes} />
      )}
      {/* Entry leg sub-polylines, coloured per movement type. */}
      {entrySegs.map((s, idx) => {
        const color = segmentColor(s.type, "entry");
        return (
          <Fragment key={`entry-${idx}`}>
            <Polyline
              positions={s.pts}
              pathOptions={{ color, weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
              eventHandlers={
                editMode && editTool === "add"
                  ? { click: (e) => insertOnLine("entry", entryRaw, e) }
                  : undefined
              }
            />
            <DirectionArrows
              points={s.pts}
              color={color}
              opacity={activeDirection === "in" ? bright : dim}
              reverse={false}
            />
            {/* Two-Way: also show reverse-direction arrows in blue on the same path. */}
            {routeType === "two_way" && (
              <DirectionArrows
                points={s.pts}
                color={REVERSE_COLOR}
                opacity={activeDirection === "out" ? bright : dim}
                reverse={true}
              />
            )}
          </Fragment>
        );
      })}
      {/* Exit leg (only meaningful for one_way). */}
      {routeType === "one_way" && exitSegs.map((s, idx) => {
        const color = segmentColor(s.type, "exit");
        return (
          <Fragment key={`exit-${idx}`}>
            <Polyline
              positions={s.pts}
              pathOptions={{ color, weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
              eventHandlers={
                editMode && editTool === "add"
                  ? { click: (e) => insertOnLine("exit", exitRaw, e) }
                  : undefined
              }
            />
            <DirectionArrows
              points={s.pts}
              color={color}
              opacity={activeDirection === "out" ? bright : dim}
              reverse={false}
            />
          </Fragment>
        );
      })}
      {!hideWaypointMarkers && waypoints.map((wp, i) => {
        const type =
          i === 0 ? "first" : i === waypoints.length - 1 && waypoints.length > 1 ? "last" : "middle";
        return (
          <Marker
            key={wp.id}
            position={[wp.lat, wp.lng]}
            icon={createMarkerIcon(type)}
            draggable={editMode && editTool === "move"}
            eventHandlers={
              editMode
                ? {
                    click: () => {
                      if (editTool === "erase") onDeleteWaypoint?.("entry", wp.id);
                    },
                    dragend: (e) => {
                      if (editTool !== "move") return;
                      const ll = (e.target as L.Marker).getLatLng();
                      onMoveWaypoint?.("entry", wp.id, ll.lat, ll.lng);
                    },
                  }
                : undefined
            }
          />
        );
      })}
      {!hideWaypointMarkers && routeType === "one_way" && exitWaypoints.length > 0 &&
        exitWaypoints.map((wp, i) => {
          const type =
            i === 0 ? "first" : i === exitWaypoints.length - 1 && exitWaypoints.length > 1 ? "last" : "middle";
          return (
            <Marker
              key={`exit-${wp.id}`}
              position={[wp.lat, wp.lng]}
              icon={createMarkerIcon(type, "exit")}
              draggable={editMode && editTool === "move"}
              eventHandlers={
                editMode
                  ? {
                      click: () => {
                        if (editTool === "erase") onDeleteWaypoint?.("exit", wp.id);
                      },
                      dragend: (e) => {
                        if (editTool !== "move") return;
                        const ll = (e.target as L.Marker).getLatLng();
                        onMoveWaypoint?.("exit", wp.id, ll.lat, ll.lng);
                      },
                    }
                  : undefined
              }
            />
          );
        })}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={createPinIcon(PIN_COLORS[p.label])}>
          <Tooltip permanent direction="top" offset={[0, -22]} opacity={1} className="pin-tooltip">
            {p.label}
          </Tooltip>
          {p.note && (
            <Tooltip direction="bottom" offset={[0, 0]} opacity={1} className="pin-note-tooltip">
              {p.note}
            </Tooltip>
          )}
        </Marker>
      ))}
      {gpsPosition && (
        <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={createGpsIcon()} />
      )}
    </MapContainer>
  );
}
