import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface Result {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  address?: { country_code?: string };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function LocationSearch({
  onSelect,
  userLocation,
  inline = false,
}: {
  onSelect: (lat: number, lng: number, label: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  inline?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          format: "json",
          addressdetails: "1",
          limit: "10",
          q,
        });
        if (userLocation) {
          const d = 3; // ~330km bias box
          params.set(
            "viewbox",
            `${userLocation.lng - d},${userLocation.lat + d},${userLocation.lng + d},${userLocation.lat - d}`,
          );
          params.set("bounded", "0");
        }
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } },
        );
        let data = (await res.json()) as Result[];

        if (userLocation) {
          // determine the user's country from the nearest result region if possible
          const withDist = data.map((r) => ({
            r,
            d: distanceKm(userLocation, { lat: parseFloat(r.lat), lng: parseFloat(r.lon) }),
          }));
          // local results first (within 2000km), then everything else, both by distance
          withDist.sort((a, b) => {
            const aLocal = a.d < 2000 ? 0 : 1;
            const bLocal = b.d < 2000 ? 0 : 1;
            if (aLocal !== bLocal) return aLocal - bLocal;
            return a.d - b.d;
          });
          data = withDist.map((x) => x.r);
        }

        setResults(data.slice(0, 6));
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={
        inline
          ? "relative w-full max-w-md z-[1200]"
          : "absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(92vw,420px)]"
      }
    >
      <div className="relative flex items-center bg-navy-950/95 border border-navy-700 rounded-full shadow-lg backdrop-blur-sm">
        <Search className="w-4 h-4 text-navy-400 absolute left-3.5 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for a location..."
          className="w-full bg-transparent text-sm text-white placeholder-navy-400 pl-10 pr-9 py-2 rounded-full focus:outline-none"
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-navy-400 absolute right-3.5 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-navy-950/95 border border-navy-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden z-[1200]">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => {
                onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                skipNextRef.current = true;
                setQ(r.display_name.split(",")[0]);
                setResults([]);
                setOpen(false);
                setLoading(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-navy-100 hover:bg-navy-800 border-b border-navy-800 last:border-b-0 truncate"
              title={r.display_name}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
