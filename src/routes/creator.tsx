import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Save, Check, LogOut, Copy } from "lucide-react";
import { ClientOnlyMap } from "@/components/RouteMap";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Create a Route — SiteNav" },
      { name: "description", content: "Draw a custom route on the satellite map and share it as a link." },
    ],
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
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [nextId, setNextId] = useState(1);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const addWaypoint = (lat: number, lng: number) => {
    setWaypoints((p) => [...p, { id: nextId, lat, lng }]);
    setNextId((n) => n + 1);
  };

  const handleClear = () => {
    setWaypoints([]);
    setNextId(1);
    setSaveStatus("idle");
    setShareUrl(null);
  };

  const openSavePrompt = () => {
    if (waypoints.length < 2) return;
    setRouteName(`Route ${new Date().toLocaleString()}`);
    setErrorMsg(null);
    setNamePromptOpen(true);
  };

  const handleSave = async () => {
    if (!user || waypoints.length < 2 || !routeName.trim()) return;
    setSaveStatus("saving");
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("routes")
      .insert({
        user_id: user.id,
        name: routeName.trim(),
        waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
      })
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

  const canSave = waypoints.length >= 2;

  if (loading || !user) return <div className="h-screen bg-navy-900" />;

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
              <h1 className="text-white font-semibold leading-tight truncate">Create Route</h1>
              <p className="text-navy-400 text-xs leading-tight">
                {waypoints.length === 0
                  ? "Click map to add points"
                  : `${waypoints.length} waypoint${waypoints.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {waypoints.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-navy-800/80 rounded-lg px-3 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-white text-sm font-medium">{waypoints.length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
            )}
            <button
              onClick={handleClear}
              disabled={waypoints.length === 0}
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
        <ClientOnlyMap waypoints={waypoints} onAddWaypoint={addWaypoint} />
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