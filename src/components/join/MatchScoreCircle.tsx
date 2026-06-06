import { cn } from "@/lib/utils";
import { useId } from "react";

export default function MatchScoreCircle({
  score,
  className,
  colorA = "#00f5d4",
  colorMid = "#a855f7",
  colorB = "#ff006e",
}: {
  score: number;
  className?: string;
  colorA?: string;
  colorMid?: string;
  colorB?: string;
}) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "relative flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72",
        className,
      )}
    >
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: `${colorA}22` }}
      />
      <div className="absolute inset-3 rounded-full border border-white/10 bg-black/30 backdrop-blur-md" />

      <svg
        className="relative h-full w-full -rotate-90"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 18px ${colorA}55)`,
          }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorA} />
            <stop offset="50%" stopColor={colorMid} />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="bg-clip-text text-6xl font-black tracking-tighter text-transparent sm:text-7xl"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${colorA}, white, ${colorB})`,
          }}
        >
          {score}
          <span className="text-3xl font-bold text-white/70 sm:text-4xl">%</span>
        </span>
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/50">
          Blend Match
        </span>
      </div>
    </div>
  );
}
