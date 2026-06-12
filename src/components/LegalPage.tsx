import { Link } from "@tanstack/react-router";
import { ArrowLeft, Navigation } from "lucide-react";
import { type ReactNode } from "react";
import SiteFooter from "./SiteFooter";

export default function LegalPage({
  title,
  effectiveDate,
  lastUpdated,
  children,
}: {
  title: string;
  effectiveDate?: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col">
      <header className="bg-navy-950 border-b border-navy-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">LOST</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-navy-300 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </header>
      <main className="flex-1 px-6 py-10 md:py-14">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h1>
          {(effectiveDate || lastUpdated) && (
            <p className="text-navy-400 text-sm mb-10">
              {effectiveDate && <>Effective Date: {effectiveDate}</>}
              {effectiveDate && lastUpdated && <>  &nbsp;|&nbsp;  </>}
              {lastUpdated && <>Last Updated: {lastUpdated}</>}
            </p>
          )}
          <div className="prose-legal space-y-8 text-navy-200 leading-relaxed text-[15px]">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalSubsection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-base md:text-lg font-semibold text-white mb-2">{heading}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}