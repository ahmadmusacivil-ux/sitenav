import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Share2, Trash2, MapPin, Check, Eye, Pin as PinIcon, User } from "lucide-react";
import { supabase, type SavedRoute } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your Routes — LOST" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: "mine" | "shared"; updated?: string; refresh?: string } => ({
    tab: search.tab === "shared" ? "shared" : search.tab === "mine" ? "mine" : undefined,
    updated: typeof search.updated === "string" ? search.updated : undefined,
    refresh: typeof search.refresh === "string" ? search.refresh : undefined,
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [sharedRoutes, setSharedRoutes] = useState<SavedRoute[] | null>(null);
  const [tab, setTab] = useState<"mine" | "shared">(search.tab ?? "mine");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (search.tab) setTab(search.tab);
  }, [search.tab]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem("sitenav:my_routes_prefetch");
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { userId?: string; routes?: SavedRoute[]; savedAt?: number };
          if (parsed.userId === user.id && Array.isArray(parsed.routes)) setRoutes(parsed.routes);
        } catch { /* ignore */ }
        window.sessionStorage.removeItem("sitenav:my_routes_prefetch");
      }
    }
    supabase
      .from("routes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRoutes((data as SavedRoute[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user, search.updated, search.refresh]);

  useEffect(() => {
    if (!user) return;
    if (tab !== "shared") return;
    let tokens: string[] = [];
    try {
      tokens = JSON.parse(localStorage.getItem("sitenav:shared_tokens") || "[]");
    } catch { /* ignore */ }
    if (tokens.length === 0) {
      setSharedRoutes([]);
      return;
    }
    setSharedRoutes(null);
    supabase
      .from("routes")
      .select("*")
      .in("share_token", tokens)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("[dashboard] shared routes query failed:", error);
          setSharedRoutes([]);
          return;
        }
        const rows = ((data as SavedRoute[]) ?? []).filter((r) => r.user_id !== user.id);
        setSharedRoutes(rows);
      });
  }, [user, tab, search.refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this route?")) return;
    const { error } = await supabase.from("routes").delete().eq("id", id);
    if (!error) setRoutes((r) => r?.filter((x) => x.id !== id) ?? null);
  };

  const handleRemoveShared = (r: SavedRoute) => {
    try {
      const arr: string[] = JSON.parse(localStorage.getItem("sitenav:shared_tokens") || "[]");
      const next = arr.filter((t) => t !== r.share_token);
      localStorage.setItem("sitenav:shared_tokens", JSON.stringify(next));
      setSharedRoutes((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
    } catch { /* ignore */ }
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
              {tab === "mine"
                ? routes ? `${routes.length} route${routes.length === 1 ? "" : "s"}` : "Loading…"
                : sharedRoutes ? `${sharedRoutes.length} shared route${sharedRoutes.length === 1 ? "" : "s"}` : "Loading…"}
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

        <div className="mb-6 inline-flex items-center bg-navy-800/60 border border-navy-700 rounded-xl p-1">
          <button
            onClick={() => setTab("mine")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === "mine" ? "bg-orange-500 text-white" : "text-navy-300 hover:text-white"
            }`}
          >
            My Routes
          </button>
          <button
            onClick={() => setTab("shared")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === "shared" ? "bg-orange-500 text-white" : "text-navy-300 hover:text-white"
            }`}
          >
            Shared with Me
          </button>
        </div>

        {tab === "mine" ? (
          routes === null ? null : routes.length === 0 ? (
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
          )
        ) : (
          sharedRoutes === null ? null : sharedRoutes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-navy-700 rounded-2xl">
              <Share2 className="w-10 h-10 text-navy-600 mx-auto mb-3" />
              <p className="text-navy-300 mb-1">No shared routes yet</p>
              <p className="text-navy-500 text-sm">
                Open a shared link and tap "Save" to add it here.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedRoutes.map((r) => (
                <div
                  key={r.id}
                  className="bg-navy-800/60 border border-navy-700 rounded-2xl p-5 hover:border-navy-600 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{r.name}</h3>
                      <p className="text-xs text-navy-400 flex items-center gap-2 flex-wrap">
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Array.isArray(r.waypoints) ? r.waypoints.length : 0} pts
                        </span>
                      </p>
                      <p className="text-xs text-navy-500 mt-1 flex items-center gap-1 truncate">
                        <User className="w-3 h-3" />
                        Shared by {r.user_id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/route/$token"
                      params={{ token: r.share_token }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                    <button
                      onClick={() => handleRemoveShared(r)}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Remove from shared list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
      <SiteFooter />
    </div>
  );
}