import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";
import { type Pin, PIN_COLORS } from "@/lib/pins";

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
}

const ENTRY_COLOR = "#f97316";
const EXIT_COLOR = "#3b82f6";

function createMarkerIcon(
  type: "first" | "last" | "middle",
  variant: "entry" | "exit" = "entry",
) {
  const base =
    type === "first" ? "route-marker-first" : type === "last" ? "route-marker-last" : "route-marker";
  const className = variant === "exit" ? `${base} route-marker-exit` : base;
  return L.divIcon({
    className,
    iconSize: type === "middle" ? [16, 16] : [20, 20],
    iconAnchor: type === "middle" ? [8, 8] : [10, 10],
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

type RouteMapProps = {
  waypoints: Waypoint[];
  exitWaypoints?: Waypoint[];
  routeType?: "two_way" | "two_route";
  activeDirection?: "in" | "out";
  onAddWaypoint?: (lat: number, lng: number) => void;
  onAddPin?: (lat: number, lng: number) => void;
  pins?: Pin[];
  pinMode?: boolean;
  gpsPosition?: { lat: number; lng: number } | null;
  fitToWaypoints?: boolean;
  followGps?: boolean;
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
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (pinMode) onAddPin?.(e.latlng.lat, e.latlng.lng);
      else onAddWaypoint?.(e.latlng.lat, e.latlng.lng);
    },
    [onAddPin, onAddWaypoint, pinMode],
  );
  const entryLine = waypoints.map((w) => [w.lat, w.lng] as [number, number]);
  const exitLine = exitWaypoints.map((w) => [w.lat, w.lng] as [number, number]);
  const allPoints = [...entryLine, ...exitLine];
  const clickable = Boolean(onAddWaypoint || onAddPin);
  const dim = 0.3;
  const bright = 0.95;

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
        maxZoom={19}
      />
      {clickable && <MapClickHandler onMapClick={handleClick} />}
      {fitToWaypoints && allPoints.length > 0 && <FitToBounds points={allPoints} />}
      {followGps && gpsPosition && <FollowGps position={gpsPosition} />}
      {entryLine.length > 1 && (
        <Polyline
          positions={entryLine}
          pathOptions={{ color: ENTRY_COLOR, weight: 3, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
        />
      )}
      {entryLine.length > 1 && (
        <DirectionArrows
          points={entryLine}
          color={ENTRY_COLOR}
          opacity={activeDirection === "in" ? bright : dim}
          reverse={false}
        />
      )}
      {routeType === "two_way" && entryLine.length > 1 && (
        <DirectionArrows
          points={entryLine}
          color={EXIT_COLOR}
          opacity={activeDirection === "out" ? bright : dim}
          reverse={true}
        />
      )}
      {routeType === "two_route" && exitLine.length > 1 && (
        <>
          <Polyline
            positions={exitLine}
            pathOptions={{ color: EXIT_COLOR, weight: 3, opacity: 0.9, lineCap: "round", lineJoin: "round", dashArray: "6 6" }}
          />
          <DirectionArrows
            points={exitLine}
            color={EXIT_COLOR}
            opacity={activeDirection === "out" ? bright : dim}
            reverse={false}
          />
        </>
      )}
      {waypoints.map((wp, i) => {
        const type =
          i === 0 ? "first" : i === waypoints.length - 1 && waypoints.length > 1 ? "last" : "middle";
        return <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createMarkerIcon(type)} />;
      })}
      {routeType === "two_route" &&
        exitWaypoints.map((wp, i) => {
          const type =
            i === 0 ? "first" : i === exitWaypoints.length - 1 && exitWaypoints.length > 1 ? "last" : "middle";
          return (
            <Marker
              key={`exit-${wp.id}`}
              position={[wp.lat, wp.lng]}
              icon={createMarkerIcon(type, "exit")}
            />
          );
        })}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={createPinIcon(PIN_COLORS[p.label])}>
          <Tooltip direction="top" offset={[0, -22]} opacity={1} permanent className="pin-tooltip">
            {p.label}
          </Tooltip>
          {p.note && (
            <Tooltip direction="bottom" offset={[0, 0]} className="pin-note-tooltip">
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

export function ClientOnlyMap(props: RouteMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute inset-0 bg-navy-950" />;
  return <RouteMap {...props} />;
}