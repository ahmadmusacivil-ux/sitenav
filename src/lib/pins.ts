export const PIN_LABELS = [
  "Entry",
  "Exit",
  "Office",
  "Toilet",
  "Parking",
  "Danger",
  "Speed Bump",
  "Gate",
  "Shed",
  "Other",
] as const;

export type PinLabel = (typeof PIN_LABELS)[number];

export type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: PinLabel;
  note?: string;
};

export const PIN_COLORS: Record<PinLabel, string> = {
  Entry: "#06b6d4",
  Exit: "#ec4899",
  Office: "#6366f1",
  Toilet: "#14b8a6",
  Parking: "#eab308",
  Danger: "#dc2626",
  "Speed Bump": "#f59e0b",
  Gate: "#8b5cf6",
  Shed: "#a16207",
  Other: "#94a3b8",
};

// Haversine distance in meters
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}