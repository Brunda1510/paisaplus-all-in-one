import { useEffect, useState } from "react";
import icon from "@/assets/paisapluse-icon.png";

const LETTERS = "aisaPluse".split("");

const COLORS = [
  "oklch(0.62 0.17 150)",
  "oklch(0.68 0.16 165)",
  "oklch(0.7 0.15 190)",
  "oklch(0.72 0.16 120)",
  "oklch(0.78 0.15 95)",
  "oklch(0.72 0.17 70)",
  "oklch(0.66 0.16 40)",
  "oklch(0.62 0.16 350)",
  "oklch(0.6 0.15 300)",
];

export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("pp-splash-seen")) return;
    sessionStorage.setItem("pp-splash-seen", "1");
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 2100);
    const t2 = setTimeout(() => setShow(false), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 px-6">
        <img
          src={icon}
          alt=""
          width={1024}
          height={1024}
          className="splash-mark size-24 object-contain sm:size-28"
        />
        <div className="flex items-baseline font-display text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="splash-letter" style={{ color: COLORS[0], animationDelay: "0.35s" }}>
            P
          </span>
          {LETTERS.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="splash-letter"
              style={{
                color: COLORS[(index + 1) % COLORS.length],
                animationDelay: `${0.45 + index * 0.09}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>
        <p className="splash-tagline text-sm text-muted-foreground">Track. Save. Grow.</p>
      </div>
    </div>
  );
}
