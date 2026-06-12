import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { MapPin, Navigation, Share2, ChevronRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SiteNav — GPS for the jobsite" },
      { name: "description", content: "Draw custom routes through construction sites, farms, and unmapped areas. Share a link, follow with live GPS." },
      { property: "og:title", content: "SiteNav — GPS for the jobsite" },
      { property: "og:description", content: "Navigate sites that Google Maps can't. Draw a route, share a link, follow live." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500 via-transparent to-transparent" />

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SiteNav</span>
          </div>
          <Link to="/creator" className="text-sm font-medium text-navy-200 hover:text-white transition-colors">
            Sign In
          </Link>
        </nav>

        <div className="relative z-10 px-6 md:px-12 pt-16 pb-24 md:pt-24 md:pb-32 max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-navy-800/80 border border-navy-700 rounded-full text-sm text-orange-400 mb-6">
              <MapPin className="w-3.5 h-3.5" />
              GPS for the jobsite
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Navigate sites that
              <span className="text-orange-500"> Google Maps can't</span>
            </h1>
            <p className="text-lg md:text-xl text-navy-300 leading-relaxed mb-10 max-w-xl">
              Draw custom routes through construction sites, farms, and unmapped areas.
              Share a link. Anyone can follow with live GPS — no app or login needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/creator" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98]">
                Create a Route
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a href="#how" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-navy-800 hover:bg-navy-700 border border-navy-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98]">
                How It Works
              </a>
            </div>
          </div>
        </div>
      </header>

      <section id="how" className="bg-navy-950 py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-navy-400 text-center mb-14 max-w-lg mx-auto">
            Three simple steps from drawing a route to navigating it on the ground.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: MapPin, step: "01", title: "Draw Your Route", desc: "Click points on a satellite map to trace the path through your site. Add as many waypoints as you need." },
              { icon: Share2, step: "02", title: "Share a Link", desc: "Save your route and get a shareable link. Send it to drivers, crew, or anyone who needs directions." },
              { icon: Navigation, step: "03", title: "Follow Live", desc: "Open the link on any phone. A live GPS blue dot shows your position along the route in real time." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="group bg-navy-900 border border-navy-800 rounded-2xl p-8 transition-all hover:border-navy-700 hover:shadow-xl">
                <div className="text-orange-500 text-sm font-mono font-bold mb-4">{step}</div>
                <div className="w-12 h-12 bg-navy-800 rounded-xl flex items-center justify-center mb-5 group-hover:bg-orange-500/10 transition-colors">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-navy-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-900 py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Built For The Field</h2>
          <p className="text-navy-400 text-center mb-14 max-w-lg mx-auto">
            Where paved roads end and Google Maps stops working.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Construction Sites", desc: "Guide delivery trucks and subcontractors through active sites with temporary roads and detours that change weekly.", image: "https://images.pexels.com/photos/1095814/pexels-photo-1095814.jpeg?auto=compress&cs=tinysrgb&w=800" },
              { title: "Farms & Ranches", desc: "Navigate sprawling agricultural properties with private dirt roads, field paths, and equipment routes.", image: "https://images.pexels.com/photos/2588976/pexels-photo-2588976.jpeg?auto=compress&cs=tinysrgb&w=800" },
              { title: "Large Events & Festivals", desc: "Direct vendors, emergency vehicles, and staff through temporary venue layouts and service roads.", image: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800" },
              { title: "Industrial Facilities", desc: "Route visitors and new contractors through complex plant layouts with restricted zones and one-way roads.", image: "https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=800" },
            ].map(({ title, desc, image }) => (
              <div key={title} className="group relative overflow-hidden rounded-2xl bg-navy-800 border border-navy-700 hover:border-navy-600 transition-all">
                <div className="h-48 overflow-hidden">
                  <img src={image} alt={title} className="w-full h-full object-cover opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-navy-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-orange-600 to-orange-500 py-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to map your site?</h2>
          <p className="text-orange-100 text-lg mb-8">Start drawing routes in seconds. No signup needed to try it out.</p>
          <Link to="/creator" className="inline-flex items-center gap-2 px-8 py-4 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-xl transition-all hover:shadow-xl active:scale-[0.98]">
            Create a Route
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
