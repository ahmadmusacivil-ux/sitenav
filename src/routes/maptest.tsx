import { createFileRoute } from "@tanstack/react-router";
import RouteMap from "@/components/RouteMap";

export const Route = createFileRoute("/maptest")({
  component: () => (
    <div className="relative h-screen w-full">
      <RouteMap waypoints={[]} onAddWaypoint={() => {}} />
    </div>
  ),
});
