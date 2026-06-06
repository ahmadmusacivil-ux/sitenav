import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

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

function MapClickHandler({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

export default function RouteMap({
  waypoints,
  onAddWaypoint,
}: {
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => onAddWaypoint(e.latlng.lat, e.latlng.lng),
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
      <MapClickHandler onMapClick={handleClick} />
      {polyline.length > 1 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: "#f97316", weight: 3, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
        />
      )}
      {waypoints.map((wp, i) => {
        const type =
          i === 0 ? "first" : i === waypoints.length - 1 && waypoints.length > 1 ? "last" : "middle";
        return <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createMarkerIcon(type)} />;
      })}
    </MapContainer>
  );
}

export function ClientOnlyMap(props: Parameters<typeof RouteMap>[0]) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute inset-0 bg-navy-950" />;
  return <RouteMap {...props} />;
}