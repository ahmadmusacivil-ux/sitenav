import { Link } from "@tanstack/react-router";

export default function SiteFooter() {
  return (
    <footer className="bg-navy-950 border-t border-navy-800 py-6 px-6 md:px-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <p className="text-navy-500">
          &copy; {new Date().getFullYear()} LOST. GPS navigation for the field.
        </p>
        <nav className="flex items-center gap-5">
          <Link to="/privacy" className="text-navy-400 hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-navy-400 hover:text-white transition-colors">
            Terms &amp; Conditions
          </Link>
          <Link to="/safety" className="text-navy-400 hover:text-white transition-colors">
            Safety Disclaimer
          </Link>
        </nav>
      </div>
    </footer>
  );
}