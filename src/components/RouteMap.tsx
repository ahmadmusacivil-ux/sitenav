import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
}

function createMarkerIcon(type: "first" | "last" | "middle") {
  const className =
    type === "first" ? "route-marker-first" : type === "last" ? "route-marker-last" : "route-marker";
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

function RouteArrows({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join("|");
  useEffect(() => {
    if (points.length < 2) return;
    const decorator = (L as unknown as {
      polylineDecorator: (line: L.Polyline, opts: unknown) => L.Layer;
    }).polylineDecorator(L.polyline(points), {
      patterns: [
        {
          offset: 30,
          repeat: 80,
          symbol: (L as unknown as { Symbol: { arrowHead: (o: unknown) => unknown } }).Symbol.arrowHead({
            pixelSize: 12,
            polygon: false,
            pathOptions: { stroke: true, color: "#f97316", weight: 3, opacity: 0.95 },
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
  onAddWaypoint?: (lat: number, lng: number) => void;
  gpsPosition?: { lat: number; lng: number } | null;
  fitToWaypoints?: boolean;
  followGps?: boolean;
};

export default function RouteMap({
  waypoints,
  onAddWaypoint,
  gpsPosition,
  fitToWaypoints = false,
  followGps = false,
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => onAddWaypoint?.(e.latlng.lat, e.latlng.lng),
    [onAddWaypoint],
  );
  const polyline = waypoints.map((w) => [w.lat, w.lng] as [number, number]);

  return (
    <MapContainer
      ref={mapRef}
      center={[-25.2744, 133.7751]}
      zoom={5}
      scrollWheelZoom
      zoomControl
      className="absolute inset-0 w-full h-full"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      {onAddWaypoint && <MapClickHandler onMapClick={handleClick} />}
      {fitToWaypoints && polyline.length > 0 && <FitToBounds points={polyline} />}
      {followGps && gpsPosition && <FollowGps position={gpsPosition} />}
      {polyline.length > 1 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: "#f97316", weight: 3, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
        />
      )}
      {polyline.length > 1 && <RouteArrows points={polyline} />}
      {waypoints.map((wp, i) => {
        const type =
          i === 0 ? "first" : i === waypoints.length - 1 && waypoints.length > 1 ? "last" : "middle";
        return <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createMarkerIcon(type)} />;
      })}
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