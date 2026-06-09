import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Save,
  Check,
  LogOut,
  Copy,
  MapPin,
  Route as RouteIcon,
  Pencil,
  Car,
  Play,
  Square,
  RotateCcw,
  Undo2,
  Wrench,
} from "lucide-react";
import { ClientOnlyMap, type BackgroundRoute } from "@/components/RouteMap";
import LocationSearch from "@/components/LocationSearch";
import { useAuth } from "@/lib/auth";
import { supabase, type RouteType } from "@/lib/supabase";
import { PIN_LABELS, PIN_COLORS, type Pin, type PinLabel } from "@/lib/pins";

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Create a Route — SiteNav" },
      { name: "description", content: "Draw a custom route on the satellite map and share it as a link." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  component: CreatorPage,
});

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
}

function CreatorPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { edit: editId } = Route.useSearch();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [exitWaypoints, setExitWaypoints] = useState<Waypoint[]>([]);
  const [nextId, setNextId] = useState(1);
  const [pins, setPins] = useState<Pin[]>([]);
  const [routeType, setRouteType] = useState<RouteType>("two_way");
  const [drawingLeg, setDrawingLeg] = useState<"entry" | "exit">("entry");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShareToken, setEditingShareToken] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(Boolean(editId));
  const [mode, setMode] = useState<"waypoint" | "pin">("waypoint");
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinLabel, setPinLabel] = useState<PinLabel>("Entry");
  const [pinNote, setPinNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number; seq: number } | null>(null);
  const gpsFlewRef = useRef(false);
  const [backgroundRoutes, setBackgroundRoutes] = useState<BackgroundRoute[]>([]);

  // Drive & Record mode
  const [creatorMode, setCreatorMode] = useState<"draw" | "record">("draw");
  const [recording, setRecording] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [recordSummary, setRecordSummary] = useState<{ points: number; meters: number; leg: "entry" | "exit" } | null>(null);
  const recordWatchRef = useRef<number | null>(null);
  const recordLegRef = useRef<"entry" | "exit">("entry");
  const lastRecordedRef = useRef<{ lat: number; lng: number } | null>(null);
  const recordIdRef = useRef(0);

  const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const pathDistance = (pts: { lat: number; lng: number }[]) => {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    return d;
  };

  const smoothWaypoints = (pts: Waypoint[]): Waypoint[] => {
    if (pts.length < 3) return pts;
    const filtered: Waypoint[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = {
        lat: (pts[i - 1].lat + pts[i + 1].lat) / 2,
        lng: (pts[i - 1].lng + pts[i + 1].lng) / 2,
      };
      if (haversine(mid, pts[i]) <= 10) filtered.push(pts[i]);
    }
    filtered.push(pts[pts.length - 1]);
    const smoothed: Waypoint[] = filtered.map((p, i, a) => {
      if (i === 0 || i === a.length - 1) return p;
      const lat = (a[i - 1].lat + p.lat + a[i + 1].lat) / 3;
      const lng = (a[i - 1].lng + p.lng + a[i + 1].lng) / 3;
      return { ...p, lat, lng };
    });
    return smoothed;
  };

  const stopRecording = () => {
    if (recordWatchRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(recordWatchRef.current);
    }
    recordWatchRef.current = null;
    setRecording(false);
    const leg = recordLegRef.current;
    let pts = leg === "exit" ? exitWaypoints : waypoints;
    pts = smoothWaypoints(pts);
    if (leg === "exit") setExitWaypoints(pts);
    else setWaypoints(pts);
    setRecordSummary({
      points: pts.length,
      meters: Math.round(pathDistance(pts)),
      leg,
    });
  };

  const startRecording = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const leg: "entry" | "exit" =
      routeType === "two_route" && drawingLeg === "exit" ? "exit" : "entry";
    recordLegRef.current = leg;
    if (leg === "exit") setExitWaypoints([]);
    else setWaypoints([]);
    lastRecordedRef.current = null;
    setRecordSummary(null);
    setRecording(true);
    recordWatchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        if (typeof acc === "number" && acc > 15) return;
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setGpsPos(next);
        setFlyTarget({ ...next, zoom: 18, seq: Date.now() });
        const last = lastRecordedRef.current;
        if (last && haversine(last, next) < 5) return;
        lastRecordedRef.current = next;
        const id = ++recordIdRef.current + 1_000_000;
        if (recordLegRef.current === "exit") {
          setExitWaypoints((arr) => [...arr, { id, lat: next.lat, lng: next.lng }]);
        } else {
          setWaypoints((arr) => [...arr, { id, lat: next.lat, lng: next.lng }]);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
    );
  };

  const reRecord = () => {
    const leg = recordSummary?.leg ?? recordLegRef.current;
    if (leg === "exit") setExitWaypoints([]);
    else setWaypoints([]);
    setRecordSummary(null);
    lastRecordedRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (recordWatchRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(recordWatchRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("routes")
      .select("id,name,waypoints,exit_waypoints,route_type")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const rows = data as {
          id: string;
          name: string;
          waypoints: { lat: number; lng: number }[] | null;
          exit_waypoints: { lat: number; lng: number }[] | null;
          route_type: "two_way" | "two_route" | null;
        }[];
        const bg: BackgroundRoute[] = rows
          .filter((r) => r.id !== editId)
          .map((r) => ({
            id: r.id,
            name: r.name,
            entry: (r.waypoints ?? []).map((w) => [w.lat, w.lng] as [number, number]),
            exit: (r.exit_waypoints ?? []).map((w) => [w.lat, w.lng] as [number, number]),
            routeType: r.route_type ?? "two_way",
          }))
          .filter((r) => r.entry.length > 1);
        setBackgroundRoutes(bg);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setGpsPos(next);
        if (!gpsFlewRef.current && !editId) {
          gpsFlewRef.current = true;
          setFlyTarget({ ...next, zoom: 17, seq: Date.now() });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [editId]);

  useEffect(() => {
    if (!user || !editId) {
      setLoadingRoute(false);
      return;
    }
    setLoadingRoute(true);
    supabase
      .from("routes")
      .select("id,user_id,name,waypoints,exit_waypoints,route_type,pins,share_token,created_at")
      .eq("id", editId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const r = data as
          | {
              id: string;
              name: string;
              waypoints: { lat: number; lng: number }[];
              exit_waypoints: { lat: number; lng: number }[] | null;
              route_type: RouteType | null;
              pins: Pin[] | null;
              share_token: string;
            }
          | null;
        if (r) {
          const wps = (r.waypoints || []).map((w, i) => ({ id: i + 1, lat: w.lat, lng: w.lng }));
          const exits = (r.exit_waypoints || []).map((w, i) => ({
            id: wps.length + i + 1,
            lat: w.lat,
            lng: w.lng,
          }));
          setWaypoints(wps);
          setExitWaypoints(exits);
          setNextId(wps.length + exits.length + 1);
          setRouteType(r.route_type === "two_route" ? "two_route" : "two_way");
          setPins(
            (r.pins || []).filter((p): p is Pin => !!p && typeof p.lat === "number"),
          );
          setRouteName(r.name);
          setEditingId(r.id);
          setEditingShareToken(r.share_token);
        }
        setLoadingRoute(false);
      });
  }, [editId, user]);

  const addWaypoint = (lat: number, lng: number) => {
    if (editMode) return;
    if (routeType === "two_route" && drawingLeg === "exit") {
      setExitWaypoints((p) => [...p, { id: nextId, lat, lng }]);
    } else {
      setWaypoints((p) => [...p, { id: nextId, lat, lng }]);
    }
    setNextId((n) => n + 1);
  };

  const undoLastWaypoint = () => {
    if (routeType === "two_route" && drawingLeg === "exit") {
      setExitWaypoints((p) => p.slice(0, -1));
    } else {
      setWaypoints((p) => p.slice(0, -1));
    }
  };

  const handleMoveWaypoint = (leg: "entry" | "exit", id: number, lat: number, lng: number) => {
    const updater = (arr: Waypoint[]) => arr.map((w) => (w.id === id ? { ...w, lat, lng } : w));
    if (leg === "exit") setExitWaypoints(updater);
    else setWaypoints(updater);
  };

  const handleDeleteWaypoint = (leg: "entry" | "exit", id: number) => {
    const updater = (arr: Waypoint[]) => arr.filter((w) => w.id !== id);
    if (leg === "exit") setExitWaypoints(updater);
    else setWaypoints(updater);
  };

  const handleInsertWaypoint = (leg: "entry" | "exit", afterIndex: number, lat: number, lng: number) => {
    const newWp: Waypoint = { id: nextId, lat, lng };
    setNextId((n) => n + 1);
    const updater = (arr: Waypoint[]) => {
      const next = arr.slice();
      next.splice(afterIndex + 1, 0, newWp);
      return next;
    };
    if (leg === "exit") setExitWaypoints(updater);
    else setWaypoints(updater);
  };

  const startPinPlacement = (lat: number, lng: number) => {
    setPendingPin({ lat, lng });
    setPinLabel("Entry");
    setPinNote("");
  };

  const confirmPin = () => {
    if (!pendingPin) return;
    setPins((p) => [
      ...p,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        lat: pendingPin.lat,
        lng: pendingPin.lng,
        label: pinLabel,
        note: pinNote.trim() || undefined,
      },
    ]);
    setPendingPin(null);
    setMode("waypoint");
  };

  const cancelPin = () => setPendingPin(null);

  const handleClear = () => {
    setWaypoints([]);
    setExitWaypoints([]);
    setNextId(1);
    setPins([]);
    setSaveStatus("idle");
    setShareUrl(null);
  };

  const openSavePrompt = () => {
    if (!canSave) return;
    setRouteName(`Route ${new Date().toLocaleString()}`);
    setErrorMsg(null);
    setNamePromptOpen(true);
  };

  const handleSave = async () => {
    if (!user || !canSave || !routeName.trim()) return;
    setSaveStatus("saving");
    setErrorMsg(null);
    const payload = {
      name: routeName.trim(),
      waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
      exit_waypoints:
        routeType === "two_route"
          ? exitWaypoints.map((w) => ({ lat: w.lat, lng: w.lng }))
          : [],
      route_type: routeType,
      pins: pins.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        label: p.label,
        note: p.note ?? null,
      })),
    };
    if (editingId) {
      const { error } = await supabase
        .from("routes")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id);
      if (error) {
        setSaveStatus("error");
        setErrorMsg(error.message);
        return;
      }
      setSaveStatus("saved");
      if (editingShareToken) {
        setShareUrl(`${window.location.origin}/route/${editingShareToken}`);
      }
      setNamePromptOpen(false);
    } else {
      const { data, error } = await supabase
        .from("routes")
        .insert({ user_id: user.id, ...payload })
        .select("share_token")
        .single();
      if (error || !data) {
        setSaveStatus("error");
        setErrorMsg(error?.message ?? "Failed to save");
        return;
      }
      setSaveStatus("saved");
      setShareUrl(`${window.location.origin}/route/${data.share_token}`);
      setNamePromptOpen(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy share link:", shareUrl);
    }
  };

  const canSave =
    waypoints.length >= 2 &&
    (routeType === "two_way" || exitWaypoints.length >= 2);

  if (loading || !user || loadingRoute) return <div className="h-screen bg-navy-900" />;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-navy-950 border-b border-navy-800 px-3 py-2.5 z-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/dashboard"
              className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-white font-semibold leading-tight truncate">
                {editingId ? "Edit Route" : "Create Route"}
              </h1>
              <p className="text-navy-400 text-xs leading-tight">
                {mode === "pin"
                  ? "Click map to place a pin"
                  : routeType === "two_route"
                    ? `${drawingLeg === "entry" ? "Entry" : "Exit"} leg • ${waypoints.length} in / ${exitWaypoints.length} out${pins.length ? ` • ${pins.length} pin${pins.length !== 1 ? "s" : ""}` : ""}`
                    : waypoints.length === 0
                      ? "Click map to add points"
                      : `${waypoints.length} waypoint${waypoints.length !== 1 ? "s" : ""}${pins.length ? ` • ${pins.length} pin${pins.length !== 1 ? "s" : ""}` : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center bg-navy-800/80 rounded-lg p-0.5">
              <button
                onClick={() => setMode("waypoint")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "waypoint" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
                }`}
                title="Draw route mode"
              >
                <RouteIcon className="w-3.5 h-3.5" /> Route
              </button>
              <button
                onClick={() => setMode("pin")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "pin" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
                }`}
                title="Add pin mode"
              >
                <MapPin className="w-3.5 h-3.5" /> Pin
              </button>
            </div>
            <button
              onClick={() => setMode((m) => (m === "pin" ? "waypoint" : "pin"))}
              className={`sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mode === "pin"
                  ? "bg-orange-500 text-white"
                  : "bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden xs:inline">{mode === "pin" ? "Placing…" : "Pin"}</span>
            </button>
            <button
              onClick={handleClear}
              disabled={waypoints.length === 0 && pins.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xs:inline">Clear</span>
            </button>
            <button
              onClick={openSavePrompt}
              disabled={!canSave || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {saveStatus === "saving" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden xs:inline">Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden xs:inline">Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden xs:inline">Save</span>
                </>
              )}
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-navy-800/80 rounded-lg p-0.5">
            <button
              onClick={() => {
                if (recording) return;
                setCreatorMode("draw");
              }}
              disabled={recording}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                creatorMode === "draw" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
              }`}
              title="Draw mode — tap map to add waypoints"
            >
              <Pencil className="w-3.5 h-3.5" /> Draw
            </button>
            <button
              onClick={() => {
                if (recording) return;
                setCreatorMode("record");
                setMode("waypoint");
              }}
              disabled={recording}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                creatorMode === "record" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
              }`}
              title="Record mode — drive to capture the route"
            >
              <Car className="w-3.5 h-3.5" /> Record
            </button>
          </div>
          <div className="inline-flex items-center bg-navy-800/80 rounded-lg p-0.5">
            <button
              onClick={() => setRouteType("two_way")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                routeType === "two_way" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
              }`}
            >
              Two-Way Route
            </button>
            <button
              onClick={() => setRouteType("two_route")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                routeType === "two_route" ? "bg-navy-700 text-white" : "text-navy-300 hover:text-white"
              }`}
            >
              Two-Route
            </button>
          </div>
          {routeType === "two_route" && (
            <div className="inline-flex items-center bg-navy-800/80 rounded-lg p-0.5">
              <button
                onClick={() => setDrawingLeg("entry")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  drawingLeg === "entry" ? "bg-orange-500 text-white" : "text-navy-300 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500 border border-white/60" />
                Entry
              </button>
              <button
                onClick={() => setDrawingLeg("exit")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  drawingLeg === "exit" ? "bg-blue-500 text-white" : "text-navy-300 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 border border-white/60" />
                Exit
              </button>
            </div>
          )}
        </div>
        {shareUrl && (
          <div className="mt-2 flex items-center gap-2 bg-navy-900 border border-navy-700 rounded-lg px-3 py-2">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-xs text-navy-300 truncate flex-1">{shareUrl}</span>
            <button
              onClick={copyShare}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded font-medium"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
        {errorMsg && saveStatus === "error" && (
          <p className="mt-2 text-red-400 text-xs">{errorMsg}</p>
        )}
      </div>

      <div className="flex-1 relative min-h-0">
        <ClientOnlyMap
          waypoints={waypoints}
          exitWaypoints={exitWaypoints}
          routeType={routeType}
          activeDirection={drawingLeg === "exit" ? "out" : "in"}
          onAddWaypoint={creatorMode === "draw" && !recording ? addWaypoint : undefined}
          onAddPin={creatorMode === "draw" && !recording ? startPinPlacement : undefined}
          pins={pins}
          pinMode={creatorMode === "draw" && mode === "pin"}
          gpsPosition={gpsPos}
          flyTo={flyTarget}
          backgroundRoutes={backgroundRoutes}
        />
        <LocationSearch
          onSelect={(lat, lng) => setFlyTarget({ lat, lng, zoom: 17, seq: Date.now() })}
        />
        {recording && (
          <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-red-500/60 rounded-full px-3 py-1.5 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <span className="text-white text-xs font-semibold">REC</span>
            <span className="text-white/80 text-xs">
              {(recordLegRef.current === "exit" ? exitWaypoints.length : waypoints.length)} pts
            </span>
          </div>
        )}
        {creatorMode === "record" && !recording && !recordSummary && (
          <div className="absolute inset-0 z-[900] pointer-events-none flex items-center justify-center">
            <button
              onClick={startRecording}
              className="pointer-events-auto inline-flex items-center gap-2 px-6 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-base font-bold shadow-2xl active:scale-[0.97] transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              Start Recording
              {routeType === "two_route" && (
                <span className="ml-1 text-xs font-normal opacity-90">
                  ({drawingLeg === "exit" ? "Exit" : "Entry"})
                </span>
              )}
            </button>
          </div>
        )}
        {creatorMode === "record" && recording && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-2xl active:scale-[0.97]"
            >
              <Square className="w-4 h-4 fill-white" />
              Stop Recording
            </button>
          </div>
        )}
        {creatorMode === "record" && !recording && recordSummary && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-navy-950/95 backdrop-blur-sm border border-navy-700 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4">
            <div className="text-white text-sm">
              <div className="font-semibold">
                {recordSummary.points} pts • {recordSummary.meters} m
              </div>
              <div className="text-navy-400 text-xs">
                {recordSummary.leg === "exit" ? "Exit" : "Entry"} recorded
              </div>
            </div>
            <button
              onClick={reRecord}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record
            </button>
          </div>
        )}
        {mode === "pin" && !pendingPin && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold shadow-lg">
              Tap the map to place a pin
            </div>
          </div>
        )}
        {waypoints.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] sm:hidden">
            <div className="bg-navy-950/90 backdrop-blur-sm border border-navy-700 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-white font-semibold text-sm">{waypoints.length} pts</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        )}
      </div>

      {pendingPin && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-navy-900 border border-navy-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-1">New pin</h2>
            <p className="text-navy-400 text-sm mb-4">Choose a label and optional note.</p>
            <label className="block text-xs font-medium text-navy-300 mb-1">Label</label>
            <div className="relative mb-3">
              <select
                value={pinLabel}
                onChange={(e) => setPinLabel(e.target.value as PinLabel)}
                className="w-full appearance-none px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-white focus:outline-none focus:border-orange-500"
              >
                {PIN_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/40"
                style={{ background: PIN_COLORS[pinLabel] }}
              />
            </div>
            <label className="block text-xs font-medium text-navy-300 mb-1">Note (optional)</label>
            <input
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmPin();
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:border-orange-500"
              placeholder="e.g. Use the left gate only"
            />
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={cancelPin}
                className="px-4 py-2 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmPin}
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {namePromptOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-navy-900 border border-navy-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-1">Name your route</h2>
            <p className="text-navy-400 text-sm mb-4">
              Give this route a name so you can find it later.
            </p>
            <input
              autoFocus
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:border-orange-500"
              placeholder="e.g. North gate to office trailer"
            />
            {errorMsg && <p className="mt-2 text-red-400 text-xs">{errorMsg}</p>}
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setNamePromptOpen(false)}
                className="px-4 py-2 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!routeName.trim() || saveStatus === "saving"}
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
              >
                {saveStatus === "saving" ? "Saving..." : "Save Route"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}