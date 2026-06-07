import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface Result {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationSearch({
  onSelect,
}: {
  onSelect: (lat: number, lng: number, label: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } },
        );
        const data = (await res.json()) as Result[];
        setResults(data);
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
  }, [q]);

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
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(92vw,420px)]"
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
        <div className="mt-1.5 bg-navy-950/95 border border-navy-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => {
                onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                setOpen(false);
                setQ(r.display_name.split(",")[0]);
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