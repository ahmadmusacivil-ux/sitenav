import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";
import "leaflet-rotate";

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

const GPS_ARROW_COLOR = "#185FA5";

/** Upward-pointing arrow (chevron-style triangle) centred on the dot. */
function arrowPath(height: number) {
  const halfW = height * 0.42;
  const apexY = 50 - height / 2;
  const baseY = 50 + height / 2;
  return `M 50 ${apexY} L ${50 + halfW} ${baseY} L 50 ${baseY - height * 0.28} L ${50 - halfW} ${baseY} Z`;
}

function createGpsIcon(heading: number | null) {
  const rot = heading == null ? null : Math.round(heading);
  const arrows =
    rot == null
      ? ""
      : `<g transform="rotate(${rot} 50 50)" fill="${GPS_ARROW_COLOR}">
           <path d="${arrowPath(35)}" opacity="0.3"/>
           <path d="${arrowPath(24)}" opacity="0.5"/>
           <path d="${arrowPath(14)}" opacity="1"/>
         </g>`;
  return L.divIcon({
    className: "gps-marker",
    html: `<svg width="100" height="100" viewBox="0 0 100 100" class="gps-svg">
        <circle cx="50" cy="50" r="12" fill="${GPS_ARROW_COLOR}" opacity="0.2"/>
        ${arrows}
        <circle class="gps-core" cx="50" cy="50" r="6" fill="#3b82f6" stroke="#fff" stroke-width="1"/>
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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function createPinIcon(color: string, label?: string) {
  return L.divIcon({
    className: "pin-marker",
    html: `<span class="pin-dot" style="background:${color}"></span>${
      label ? `<span class="pin-label">${escapeHtml(label)}</span>` : ""
    }`,
    iconSize: [22, 28],
    iconAnchor: [11, 26],
  });
}

/** Rotate + compass controls (leaflet-rotate). Bearing is degrees clockwise. */
function RotateControls() {
  const map = useMap() as L.Map & {
    setBearing?: (deg: number) => void;
    getBearing?: () => number;
  };
  const [bearingDeg, setBearingDeg] = useState(0);

  useEffect(() => {
    if (!map.getBearing) return;
    const sync = () => setBearingDeg(map.getBearing?.() ?? 0);
    map.on("rotate", sync);
    sync();
    return () => {
      map.off("rotate", sync);
    };
  }, [map]);

  const rotateBy = (delta: number) => {
    if (!map.setBearing) return;
    map.setBearing(((map.getBearing?.() ?? 0) + delta) % 360);
  };

  if (!map.setBearing) return null;

  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ pointerEvents: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="leaflet-control map-rotate-control" style={{ pointerEvents: "auto" }}>
        <button type="button" title="Rotate left" aria-label="Rotate map left" onClick={() => rotateBy(-15)}>
          ⟲
        </button>
        <button
          type="button"
          title="Reset to north"
          aria-label="Reset map to north-up"
          className="map-compass"
          onClick={() => map.setBearing?.(0)}
        >
          <span className="map-compass-dial" style={{ transform: `rotate(${-bearingDeg}deg)` }}>
            <span className="cd cd-n">N</span>
            <span className="cd cd-e">E</span>
            <span className="cd cd-s">S</span>
            <span className="cd cd-w">W</span>
            <span className="map-compass-needle" />
          </span>
        </button>
        <button type="button" title="Rotate right" aria-label="Rotate map right" onClick={() => rotateBy(15)}>
          ⟳
        </button>
      </div>
    </div>
  );
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
  const dim = 0.25;
  const bright = 0.7;

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
        const curve = smoothPath(s.pts);
        return (
          <Fragment key={`entry-${idx}`}>
            <Polyline
              positions={curve}
              pathOptions={{ color, weight: 5, opacity: 0.65, lineCap: "round", lineJoin: "round" }}
              eventHandlers={
                editMode && editTool === "add"
                  ? { click: (e) => insertOnLine("entry", entryRaw, e) }
                  : undefined
              }
            />
            <DirectionArrows
              points={curve}
              color={color}
              opacity={activeDirection === "in" ? bright : dim}
              reverse={false}
            />
            {/* Two-Way: also show reverse-direction arrows in blue on the same path. */}
            {routeType === "two_way" && (
              <DirectionArrows
                points={curve}
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
        const curve = smoothPath(s.pts);
        return (
          <Fragment key={`exit-${idx}`}>
            <Polyline
              positions={curve}
              pathOptions={{ color, weight: 5, opacity: 0.65, lineCap: "round", lineJoin: "round" }}
              eventHandlers={
                editMode && editTool === "add"
                  ? { click: (e) => insertOnLine("exit", exitRaw, e) }
                  : undefined
              }
            />
            <DirectionArrows
              points={curve}
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
        <Marker key={p.id} position={[p.lat, p.lng]} icon={createPinIcon(PIN_COLORS[p.label], p.label)}>
          {p.note && (
            <Tooltip direction="bottom" offset={[0, 4]} opacity={1} className="pin-note-tooltip">
              {p.note}

            </Tooltip>
          )}
        </Marker>
      ))}
      {gpsPosition && (
        <Marker
          position={[gpsPosition.lat, gpsPosition.lng]}
          icon={createGpsIcon(gpsHeading)}
          interactive={false}
          zIndexOffset={1000}
        />
      )}
    </MapContainer>
  );
}
