import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Share2, Trash2, MapPin, Check, Eye, Pin as PinIcon } from "lucide-react";
import { supabase, type SavedRoute } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your Routes — SiteNav" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("routes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRoutes((data as SavedRoute[]) ?? []));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this route?")) return;
    const { error } = await supabase.from("routes").delete().eq("id", id);
    if (!error) setRoutes((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  const shareUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/route/${token}` : "";

  const handleShare = async (r: SavedRoute) => {
    const url = shareUrl(r.share_token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copy share link:", url);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-navy-900" />;
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col">
      <AppHeader title="Dashboard" />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Your Routes</h1>
            <p className="text-navy-400 text-sm mt-1">
              {routes ? `${routes.length} route${routes.length === 1 ? "" : "s"}` : "Loading…"}
            </p>
          </div>
          <Link
            to="/creator"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Route</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {routes === null ? null : routes.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-navy-700 rounded-2xl">
            <MapPin className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-navy-300 mb-1">No routes yet</p>
            <p className="text-navy-500 text-sm mb-6">Draw your first route to get started.</p>
            <Link
              to="/creator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create Route
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((r) => (
              <div
                key={r.id}
                className="bg-navy-800/60 border border-navy-700 rounded-2xl p-5 hover:border-navy-600 transition-colors"
              >
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{r.name}</h3>
                    <p className="text-xs text-navy-400 flex items-center gap-2 flex-wrap">
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {Array.isArray(r.waypoints) ? r.waypoints.length : 0} pts
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PinIcon className="w-3 h-3" />
                        {Array.isArray(r.pins) ? r.pins.length : 0} pins
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/routes/$id"
                    params={{ id: r.id }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  <button
                    onClick={() => handleShare(r)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors"
                  >
                    {copiedId === r.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Delete route"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}