import { createFileRoute } from "@tanstack/react-router";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Disclaimer — LOST" },
      { name: "description", content: "Important safety information for everyone creating or following routes with LOST." },
    ],
  }),
  component: SafetyPage,
});

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5 marker:text-orange-500">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function SafetyPage() {
  return (
    <LegalPage title="LOST — Safety Disclaimer">
      <div className="border border-orange-500/30 bg-orange-500/10 rounded-xl p-4 -mt-2">
        <p className="text-orange-100 font-medium">
          LOST is a visual aid only. Always follow site signage, barriers, and instructions from site
          personnel over the app. Never operate your phone while driving.
        </p>
      </div>

      <LegalSection heading="1. LOST Is a Visual Aid Only">
        <p>
          LOST shows custom GPS routes drawn or recorded by users on satellite imagery. It is not a
          certified navigation system, a safety device, or a substitute for site signage, traffic
          management, spotters, supervision, or professional judgment.
        </p>
        <p>
          GPS accuracy, satellite imagery, and the route itself can all be wrong. Always treat the
          real world — signs, barriers, fences, and the instructions of site personnel — as the source
          of truth.
        </p>
      </LegalSection>

      <LegalSection heading="2. Order of Precedence">
        <p>If anything in LOST conflicts with what you see on site, the on-site information always wins. In order:</p>
        <Bullets
          items={[
            "Instructions from site personnel and emergency procedures.",
            "Site signage, barriers, traffic controllers, and physical site layout.",
            "The site's traffic management plan, induction materials, and SWMS.",
            "Routes shown in LOST.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. For Route Creators">
        <Bullets
          items={[
            "Only map locations you have authority to map and share.",
            "Draw routes that match safe, approved paths for the intended users and vehicle types (consider blind corners, turning circles, and one-way requirements).",
            "Align routes with the site's traffic management plan and vehicle movement plan where one exists. LOST supplements these plans — it does not replace them.",
            "Update or delete routes IMMEDIATELY when site conditions change. An outdated route is worse than no route.",
            "Tell route followers that the route is a guide only and brief them on current site conditions.",
            "Do not place pins or labels revealing sensitive or secure locations to people who should not know them.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. For Route Followers (Drivers, Operators, Visitors)">
        <Bullets
          items={[
            "Complete all required site inductions before entering any site. LOST is not an induction.",
            "Obey all site speed limits, signage, and instructions from personnel.",
            "Set up the route BEFORE entering the site. Do not interact with your phone while moving.",
            "Keep your eyes on the real environment — pedestrians, plant, machinery, and changing conditions — not on the screen.",
            "If you lose GPS signal, the route looks wrong, or you become unsure: stop in a safe location and call your site contact.",
            "Report inaccurate or unsafe routes to the person who shared them, and stop following them.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="5. Device and Signal Limitations">
        <Bullets
          items={[
            "The Service requires an internet connection and a GPS-capable device. Remote sites, basements, tunnels, and metal structures can block both.",
            "Battery, screen brightness in sunlight, device mounting, and weather can all affect usability. Plan accordingly.",
            "Always carry a backup: the phone number of your site contact and basic knowledge of where you are going.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. Emergencies">
        <Bullets
          items={[
            "LOST is not an emergency tool and cannot call for help.",
            "In an emergency in Australia, call 000. Elsewhere, use your local emergency number.",
            "Follow the site's emergency procedures and muster points — these are established during induction, not by the app.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="7. Acknowledgement">
        <p>
          By using LOST, you acknowledge that you have read and understood this Safety Disclaimer,
          that you accept full responsibility for your own safety and conduct on site, and that you
          will use the Service only as a supplementary visual aid in accordance with these guidelines
          and the LOST Terms &amp; Conditions.
        </p>
        <p className="text-navy-400 text-sm">
          Questions or hazard reports: ahmadmusa.civil@gmail.com
        </p>
      </LegalSection>
    </LegalPage>
  );
}