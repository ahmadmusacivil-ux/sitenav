import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SiteNav" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreed) {
      setErr("Please agree to the Terms, Privacy Policy, and Safety Disclaimer to continue.");
      return;
    }
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else setInfo("Check your email to confirm your account.");
      }
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col">
      <div className="px-6 py-4 flex items-center gap-2">
        <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
          <Navigation className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">SiteNav</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-navy-800/60 border border-navy-700 rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-navy-300 text-sm mb-6">
            {mode === "signin" ? "Sign in to manage your routes." : "Start drawing and sharing routes."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-navy-900 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:border-orange-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-navy-900 border border-navy-700 text-white placeholder-navy-500 focus:outline-none focus:border-orange-500"
                placeholder="••••••••"
              />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            {info && <p className="text-sm text-green-400">{info}</p>}
            {mode === "signup" && (
              <label className="flex items-start gap-2.5 text-xs text-navy-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-navy-600 bg-navy-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                />
                <span>
                  I have read and agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                    Terms &amp; Conditions
                  </a>
                  ,{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                    Privacy Policy
                  </a>
                  , and{" "}
                  <a href="/safety" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                    Safety Disclaimer
                  </a>
                  .
                </span>
              </label>
            )}
            <button
              type="submit"
              disabled={busy || (mode === "signup" && !agreed)}
              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
              setInfo(null);
              setAgreed(false);
            }}
            className="mt-5 w-full text-sm text-navy-300 hover:text-white"
          >
            {mode === "signin"
              ? "No account yet? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}