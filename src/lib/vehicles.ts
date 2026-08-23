// Vehicle class + icon definitions shared by the creator, dashboard,
// follower and site-map pages.

export const VEHICLE_PRESETS = [
  { value: "LV", label: "Light Vehicle (LV)" },
  { value: "HV", label: "Heavy Vehicle (HV)" },
] as const;

export type VehicleIconId = "dot" | "car" | "truck" | "van";

export const VEHICLE_ICON_OPTIONS: { id: VehicleIconId; label: string }[] = [
  { id: "dot", label: "Default dot" },
  { id: "car", label: "Car" },
  { id: "truck", label: "Truck" },
  { id: "van", label: "Van" },
];

/** Inline SVG body (24x24 viewBox, stroke-based) for each built-in icon. */
export const VEHICLE_ICON_SVG: Record<Exclude<VehicleIconId, "dot">, string> = {
  car: '<path d="M4 17h16M3.5 13l2-5.5h13L20.5 13v4h-17z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
  truck:
    '<path d="M2 6.5h11.5v9H2z"/><path d="M13.5 10h4l3.5 3.5v2h-7.5z"/><circle cx="6" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
  van: '<path d="M2 7.5h13l4.5 4.5v3.5H2z"/><path d="M8 7.5v4.5M2 12h17.5"/><circle cx="7" cy="16.5" r="1.7"/><circle cx="16" cy="16.5" r="1.7"/>',
};

export function isCustomIcon(icon: string | null | undefined): boolean {
  return typeof icon === "string" && icon.startsWith("data:");
}

export function vehicleLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  const preset = VEHICLE_PRESETS.find((p) => p.value === v);
  return preset ? preset.label : v;
}

/** Downscale an uploaded image to a small square data URL for storage. */
export async function fileToIconDataUrl(file: File, size = 72): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}
