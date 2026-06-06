import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2, Save, Check } from "lucide-react";
import { ClientOnlyMap } from "@/components/RouteMap";

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
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [nextId, setNextId] = useState(1);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const addWaypoint = (lat: number, lng: number) => {
    setWaypoints((p) => [...p, { id: nextId, lat, lng }]);
    setNextId((n) => n + 1);
  };

  const handleClear = () => {
    setWaypoints([]);
    setNextId(1);
    setSaveStatus("idle");
  };

  const handleSave = () => {
    if (waypoints.length < 2) return;
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 800);
  };

  const canSave = waypoints.length >= 2;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-navy-950 border-b border-navy-800 px-3 py-2.5 z-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/"
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
              onClick={handleSave}
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
          </div>
        </div>
        {saveStatus === "saved" && (
          <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs">
            <Check className="w-3.5 h-3.5" />
            Route saved! (Database integration coming soon)
          </div>
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
    </div>
  );
}