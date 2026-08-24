import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";
import { type Pin, PIN_COLORS } from "@/lib/pins";
import { type SegmentType, type RouteType } from "@/lib/supabase";
import { VEHICLE_ICON_SVG, isCustomIcon } from "@/lib/vehicles";
import { RotateCcw, RotateCw, Navigation as NavigationIcon } from "lucide-react";

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

const GPS_ARROW_COLOR = "#185FA5";

/** Upward-pointing arrow (chevron-style triangle) centred on the dot. */
function arrowPath(height: number) {
  const halfW = height * 0.42;
  const apexY = 50 - height / 2;
  const baseY = 50 + height / 2;
  return `M 50 ${apexY} L ${50 + halfW} ${baseY} L 50 ${baseY - height * 0.28} L ${50 - halfW} ${baseY} Z`;
}

function vehicleMarkup(icon: string | null | undefined, rot: number) {
  if (!icon || icon === "dot") return "";
  const spin = `rotate(${rot} 50 50)`;
  if (isCustomIcon(icon)) {
    return `<g transform="${spin}"><image href="${icon}" x="32" y="32" width="36" height="36" preserveAspectRatio="xMidYMid meet"/></g>`;
  }
  const body = VEHICLE_ICON_SVG[icon as keyof typeof VEHICLE_ICON_SVG];
  if (!body) return "";
  // 24x24 icon body scaled up and centred on the dot.
  return `<g transform="${spin} translate(32 32) scale(1.5)" fill="none" stroke="#fff" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" paint-order="stroke">${body}</g>
          <g transform="${spin} translate(32 32) scale(1.5)" fill="none" stroke="${GPS_ARROW_COLOR}" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}

function createGpsIcon(heading: number | null, vehicleIcon?: string | null) {
  const rot = heading == null ? null : Math.round(heading);
  const arrows =
    rot == null
      ? ""
      : `<g transform="rotate(${rot} 50 50)" fill="${GPS_ARROW_COLOR}">
           <path d="${arrowPath(35)}" opacity="0.3"/>
           <path d="${arrowPath(24)}" opacity="0.5"/>
           <path d="${arrowPath(14)}" opacity="1"/>
         </g>`;
  const vehicle = vehicleMarkup(vehicleIcon, rot ?? 0);
  return L.divIcon({
    className: "gps-marker",
    html: `<svg width="100" height="100" viewBox="0 0 100 100" class="gps-svg">
        <circle cx="50" cy="50" r="12" fill="${GPS_ARROW_COLOR}" opacity="0.2"/>
        ${arrows}
        ${vehicle
          ? vehicle
          : `<circle class="gps-core" cx="50" cy="50" r="6" fill="#3b82f6" stroke="#fff" stroke-width="1"/>`}
      </svg>`,
    iconSize: [100, 100],
    iconAnchor: [50, 50],
  });
}

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Device compass heading in degrees (0 = north), or null when unavailable. */
function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkit === "number" && !Number.isNaN(webkit)) {
        setHeading(webkit);
      } else if (e.absolute && typeof e.alpha === "number") {
        setHeading((360 - e.alpha) % 360);
      }
    };
    window.addEventListener("deviceorientationabsolute", onOrient as EventListener);
    window.addEventListener("deviceorientation", onOrient as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient as EventListener);
      window.removeEventListener("deviceorientation", onOrient as EventListener);
    };
  }, []);
  return heading;
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
  /** Distinct colour so several site routes can be told apart. */
  color?: string;
  opacity?: number;
};

/** Palette used when several routes share one map. */
export const ROUTE_PALETTE = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#fb923c",
  "#f87171",
  "#22d3ee",
];

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

function BackgroundRoutes({
  routes,
  onSelect,
}: {
  routes: BackgroundRoute[];
  onSelect?: (id: string) => void;
}) {
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
        const opts = {
          color: r.color ?? BG_COLOR,
          weight: 6,
          opacity: r.opacity ?? 0.3,
          lineCap: "round" as const,
          lineJoin: "round" as const,
        };
        const handlers = onSelect ? { click: () => onSelect(r.id) } : undefined;
        return (
          <Fragment key={r.id}>
            {entry.length > 1 && (
              <Polyline positions={entry} pathOptions={opts} eventHandlers={handlers}>
                {r.name && (
                  <Tooltip sticky direction="top" opacity={1} className="bg-route-tooltip">
                    {r.name}
                  </Tooltip>
                )}
              </Polyline>
            )}
            {exit.length > 1 && (
              <Polyline positions={exit} pathOptions={opts} eventHandlers={handlers}>
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
  /** Built-in icon id or data URL shown as the "you are here" marker. */
  vehicleIcon?: string | null;
  /** Show rotation + compass controls (view-only pages). */
  allowRotation?: boolean;
  /** Click a background route line. */
  onSelectBackgroundRoute?: (id: string) => void;
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
  vehicleIcon,
  allowRotation = false,
  onSelectBackgroundRoute,
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [rotation, setRotation] = useState(0);
  const compassHeading = useDeviceHeading();
  // Fallback when the device has no compass: point at the next waypoint.
  let gpsHeading: number | null = compassHeading;
  if (gpsHeading == null && gpsPosition) {
    const leg = activeDirection === "out" && exitWaypoints.length > 1 ? exitWaypoints : waypoints;
    if (leg.length > 0) {
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < leg.length; i++) {
        const d = (leg[i].lat - gpsPosition.lat) ** 2 + (leg[i].lng - gpsPosition.lng) ** 2;
        if (d < best) { best = d; nearest = i; }
      }
      const target = leg[Math.min(nearest + 1, leg.length - 1)];
      gpsHeading = bearing(gpsPosition, target);
    }
  }
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

  const drawCursor = Boolean(onAddWaypoint) && !editMode && !pinMode;

  const mapEl = (
    <MapContainer
      ref={mapRef}
      center={[-25.2744, 133.7751]}
      zoom={5}
      scrollWheelZoom
      zoomControl
      className={`absolute inset-0 w-full h-full ${pinMode ? "cursor-pin" : drawCursor ? "cursor-draw" : ""}`}
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
        <BackgroundRoutes routes={backgroundRoutes} onSelect={onSelectBackgroundRoute} />
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
        <Marker
          position={[gpsPosition.lat, gpsPosition.lng]}
          icon={createGpsIcon(gpsHeading, vehicleIcon)}
          interactive={false}
          zIndexOffset={1000}
        />
      )}
    </MapContainer>
  );

  if (!allowRotation) return mapEl;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute map-rotator"
        style={{ inset: "-30%", transform: `rotate(${rotation}deg)` }}
      >
        {mapEl}
      </div>
      <div className="absolute right-3 bottom-24 z-[1000] flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Rotate map anticlockwise"
          onClick={() => setRotation((r) => r - 15)}
          className="h-9 w-9 rounded-full bg-background/90 border border-border shadow flex items-center justify-center text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Reset map to north up"
          onClick={() => setRotation(0)}
          className="h-11 w-11 rounded-full bg-background/90 border border-border shadow flex items-center justify-center"
        >
          <span
            className="relative block h-7 w-7"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <span className="absolute inset-x-0 top-0 text-[9px] font-bold text-primary text-center leading-none">N</span>
            <span className="absolute inset-x-0 bottom-0 text-[9px] font-semibold text-muted-foreground text-center leading-none">S</span>
            <span className="absolute inset-y-0 left-0 flex items-center text-[9px] font-semibold text-muted-foreground leading-none">W</span>
            <span className="absolute inset-y-0 right-0 flex items-center text-[9px] font-semibold text-muted-foreground leading-none">E</span>
            <NavigationIcon className="absolute inset-0 m-auto h-3.5 w-3.5 text-primary" />
          </span>
        </button>
        <button
          type="button"
          aria-label="Rotate map clockwise"
          onClick={() => setRotation((r) => r + 15)}
          className="h-9 w-9 rounded-full bg-background/90 border border-border shadow flex items-center justify-center text-foreground"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
