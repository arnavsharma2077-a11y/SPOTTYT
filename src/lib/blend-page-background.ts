export function getBlendPageBackgroundClass(
  overlapScore: number | null,
): string {
  if (overlapScore !== null && overlapScore < 60) {
    return "bg-gradient-to-br from-slate-950 via-zinc-900 to-rose-950";
  }

  return "bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950";
}

export function getBlendShareCardBackgroundClass(
  overlapScore: number,
): string {
  if (overlapScore < 60) {
    return "bg-gradient-to-br from-slate-950 via-zinc-900 to-rose-950";
  }

  return "bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950";
}
