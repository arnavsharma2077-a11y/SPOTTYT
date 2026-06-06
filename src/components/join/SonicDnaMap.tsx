import { Dna } from "lucide-react";

import type { SonicDnaDimension } from "@/types/blend";

export default function SonicDnaMap({
  dimensions,
}: {
  dimensions: SonicDnaDimension[];
}) {
  if (dimensions.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-10 text-center">
        <Dna className="mb-3 h-8 w-8 text-[#00f5d4]/60" />
        <p className="text-sm text-white/50">
          Not enough sonic signal yet — import richer playlists to map your DNA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,245,212,0.12),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,0,110,0.12),transparent_45%)]"
        />

        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dimensions.map((dimension, index) => (
            <div
              key={dimension.label}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 px-3 py-4 text-center transition hover:border-white/25"
              style={{
                animationDelay: `${index * 80}ms`,
              }}
            >
              <div
                className="mb-3 h-16 w-16 rounded-full border border-white/10 p-1"
                style={{
                  background: `conic-gradient(from 210deg, #00f5d4 ${dimension.weight}%, rgba(255,255,255,0.06) ${dimension.weight}%)`,
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-black/80 text-xs font-bold text-white">
                  {dimension.weight}
                </div>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                {dimension.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {dimensions.slice(0, 5).map((dimension) => (
          <li key={`bar-${dimension.label}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white/80">{dimension.label}</span>
              <span className="text-white/40">{dimension.weight}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] via-[#a855f7] to-[#ff006e]"
                style={{ width: `${dimension.weight}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
