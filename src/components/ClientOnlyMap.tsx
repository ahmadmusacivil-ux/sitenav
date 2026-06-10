import { lazy, Suspense, useState, useEffect } from "react";
import type { RouteMapProps } from "./RouteMap";

const LazyRouteMap = lazy(() => import("./RouteMap"));

export function ClientOnlyMap(props: RouteMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="absolute inset-0 bg-navy-950" />;
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-navy-950" />}>
      <LazyRouteMap {...props} />
    </Suspense>
  );
}
