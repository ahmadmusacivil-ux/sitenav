import { useState } from "react";
import img1 from "@/assets/onboarding-1.jpg";
import img2 from "@/assets/onboarding-2.jpg";
import img3 from "@/assets/onboarding-3.jpg";
import img4 from "@/assets/onboarding-4.jpg";

const SCREENS = [
  {
    title: "Welcome to LOST",
    text: "Create custom GPS routes on unmapped sites. Share them. Follow them.",
    img: img1,
    alt: "Aerial view of a construction site with an orange GPS route from the site entry to a destination pin",
    button: "Next",
  },
  {
    title: "Step 1: Create a Route",
    text: "Draw waypoints on the map or use Drive & Record mode to capture your route with live GPS.",
    img: img2,
    alt: "A hand tapping a map to place route waypoints",
    button: "Next",
  },
  {
    title: "Step 2: Share",
    text: "Generate a shareable link or QR code. Anyone can follow your route — no signup needed.",
    img: img3,
    alt: "Phone screen showing a share link and QR code",
    button: "Next",
  },
  {
    title: "Step 3: Follow",
    text: "Drivers open the shared link and follow the live GPS blue dot. Your position updates in real time.",
    img: img4,
    alt: "Phone showing a blue GPS dot moving along an orange route",
    button: "Start Creating",
  },
];

export default function Onboarding({
  onFinish,
  onSkip,
}: {
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [i, setI] = useState(0);
  const s = SCREENS[i];

  return (
    <div className="fixed inset-0 z-[3000] bg-navy-900/95 backdrop-blur-sm flex flex-col overflow-y-auto">
      <div className="flex justify-end px-5 py-4">
        <button
          onClick={onSkip}
          className="text-sm font-medium text-navy-300 hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-lg flex flex-col items-center text-center gap-6">
          <img
            src={s.img}
            alt={s.alt}
            loading="lazy"
            width={1024}
            height={768}
            className="w-full rounded-2xl border border-navy-700 shadow-xl"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{s.title}</h2>
          <p className="text-base sm:text-lg text-navy-200 leading-relaxed max-w-md">{s.text}</p>

          <div className="flex items-center gap-2">
            {SCREENS.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? "w-6 bg-orange-500" : "w-2 bg-navy-600"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => (i === SCREENS.length - 1 ? onFinish() : setI(i + 1))}
            className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
          >
            {s.button}
          </button>
        </div>
      </div>
    </div>
  );
}
