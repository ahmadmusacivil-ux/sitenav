import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Navigation } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AppHeader({ title }: { title?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-navy-950 border-b border-navy-800">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <Navigation className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white">LOST</span>
        {title && <span className="hidden sm:inline text-navy-400 text-sm ml-2">/ {title}</span>}
      </Link>
      <div className="flex items-center gap-3">
        {user && <span className="hidden sm:inline text-xs text-navy-400">{user.email}</span>}
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-navy-800 hover:bg-navy-700 text-navy-200 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden xs:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}