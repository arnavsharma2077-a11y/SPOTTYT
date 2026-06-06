import type { NormalizedTrack } from "@/types/blend";

import {
  buildTasteProfileVector,
  TASTE_DIMENSIONS,
  type TasteDimension,
} from "./taste-profile";

export type SonicDnaDimension = {
  label: string;
  weight: number;
};

function formatDimensionLabel(dimension: TasteDimension): string {
  if (dimension.startsWith("era-")) {
    return dimension.replace("era-", "").toUpperCase();
  }

  return dimension
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildSonicDna(
  tracksA: NormalizedTrack[],
  tracksB: NormalizedTrack[],
  limit = 8,
): SonicDnaDimension[] {
  const vectorA = buildTasteProfileVector(tracksA);
  const vectorB = buildTasteProfileVector(tracksB);

  const blended = TASTE_DIMENSIONS.map((dimension) => ({
    label: formatDimensionLabel(dimension),
    weight: (vectorA[dimension] + vectorB[dimension]) / 2,
  }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  const maxWeight = blended[0]?.weight ?? 1;

  return blended.map((entry) => ({
    label: entry.label,
    weight: Math.round((entry.weight / maxWeight) * 100),
  }));
}
