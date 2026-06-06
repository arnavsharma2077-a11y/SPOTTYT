import type { NormalizedTrack } from "@/types/blend";

import { splitArtists } from "./match-tracks";

export const TASTE_DIMENSIONS = [
  "pop",
  "hip-hop",
  "rnb",
  "indie-rock",
  "rock",
  "electronic",
  "synthwave",
  "techno",
  "house",
  "jazz",
  "country",
  "latin",
  "k-pop",
  "metal",
  "folk",
  "soul",
  "alternative",
  "dance",
  "afrobeats",
  "classical",
  "era-70s",
  "era-80s",
  "era-90s",
  "era-2000s",
  "era-2010s",
  "era-2020s",
] as const;

export type TasteDimension = (typeof TASTE_DIMENSIONS)[number];
export type TasteProfileVector = Record<TasteDimension, number>;

type WeightMap = Partial<Record<TasteDimension, number>>;

const EMPTY_VECTOR = (): TasteProfileVector =>
  Object.fromEntries(TASTE_DIMENSIONS.map((dim) => [dim, 0])) as TasteProfileVector;

const NEUTRAL_TRACK_WEIGHT = 1 / TASTE_DIMENSIONS.length;

/** Genre/era hints derived only from text present on each track row. */
const STRUCTURAL_HINTS: Array<{ pattern: RegExp; weights: WeightMap }> = [
  { pattern: /\bsynth(wave)?\b/i, weights: { synthwave: 1, electronic: 0.7, "era-80s": 0.5 } },
  { pattern: /\b(techno|acid)\b/i, weights: { techno: 1, electronic: 0.8 } },
  { pattern: /\b(house|deep house)\b/i, weights: { house: 1, dance: 0.7, electronic: 0.6 } },
  { pattern: /\b(remix|club mix|edit)\b/i, weights: { dance: 0.8, electronic: 0.6, house: 0.4 } },
  { pattern: /\b(acoustic|unplugged)\b/i, weights: { folk: 0.8, "indie-rock": 0.4, country: 0.3 } },
  { pattern: /\b(trap|drill|rap\b|hip hop|hip-hop)\b/i, weights: { "hip-hop": 1, "era-2010s": 0.5, "era-2020s": 0.7 } },
  { pattern: /\b(r&b|rnb|rhythm and blues)\b/i, weights: { rnb: 1, soul: 0.6, pop: 0.3 } },
  { pattern: /\b(soul|motown)\b/i, weights: { soul: 1, rnb: 0.7 } },
  { pattern: /\b(jazz|bebop|swing)\b/i, weights: { jazz: 1 } },
  { pattern: /\b(country|bluegrass|honky tonk)\b/i, weights: { country: 1, folk: 0.4 } },
  { pattern: /\b(folk|americana)\b/i, weights: { folk: 1, country: 0.3 } },
  { pattern: /\b(metal|heavy metal|death metal)\b/i, weights: { metal: 1, rock: 0.7 } },
  { pattern: /\b(punk|grunge|hardcore)\b/i, weights: { rock: 1, alternative: 0.7, "era-90s": 0.4 } },
  { pattern: /\b(indie|indie rock)\b/i, weights: { "indie-rock": 1, alternative: 0.6 } },
  { pattern: /\b(alternative|alt rock)\b/i, weights: { alternative: 1, rock: 0.6 } },
  { pattern: /\b(electronic|edm|electro\b|dubstep)\b/i, weights: { electronic: 1, dance: 0.6 } },
  { pattern: /\b(dance|disco|funk)\b/i, weights: { dance: 1, pop: 0.4 } },
  { pattern: /\b(pop\b|top 40)\b/i, weights: { pop: 1 } },
  { pattern: /\b(k pop|k-pop|kpop)\b/i, weights: { "k-pop": 1, pop: 0.6 } },
  { pattern: /\b(latin|reggaeton|salsa|bachata|urbano)\b/i, weights: { latin: 1, dance: 0.4 } },
  { pattern: /\b(afrobeats|afrobeat|amapiano)\b/i, weights: { afrobeats: 1, dance: 0.5 } },
  { pattern: /\b(classical|orchestr(a|al)|symphony|concerto|piano sonata)\b/i, weights: { classical: 1 } },
  { pattern: /\b(80s|1980s|eighties)\b/i, weights: { "era-80s": 1, synthwave: 0.4, pop: 0.3 } },
  { pattern: /\b(90s|1990s|nineties)\b/i, weights: { "era-90s": 1 } },
  { pattern: /\b(2000s|00s)\b/i, weights: { "era-2000s": 1 } },
  { pattern: /\b(2010s|10s)\b/i, weights: { "era-2010s": 1 } },
  { pattern: /\b(2020s|20s)\b/i, weights: { "era-2020s": 1 } },
  { pattern: /\b(70s|1970s|seventies)\b/i, weights: { "era-70s": 1 } },
];

function mergeWeights(...maps: WeightMap[]): WeightMap {
  const merged: WeightMap = {};
  for (const map of maps) {
    for (const [dim, weight] of Object.entries(map)) {
      const key = dim as TasteDimension;
      merged[key] = Math.max(merged[key] ?? 0, weight ?? 0);
    }
  }
  return merged;
}

function neutralTrackWeights(): WeightMap {
  return Object.fromEntries(
    TASTE_DIMENSIONS.map((dim) => [dim, NEUTRAL_TRACK_WEIGHT]),
  ) as WeightMap;
}

function inferTrackWeights(track: NormalizedTrack): WeightMap {
  const combinedText = [
    track.name,
    track.artist,
    ...splitArtists(track.artist),
    track.normalizedName,
    track.normalizedArtist,
  ]
    .filter(Boolean)
    .join(" ");

  let weights: WeightMap = {};

  for (const hint of STRUCTURAL_HINTS) {
    if (hint.pattern.test(combinedText)) {
      weights = mergeWeights(weights, hint.weights);
    }
  }

  if (Object.keys(weights).length === 0) {
    return neutralTrackWeights();
  }

  return weights;
}

export function buildTasteProfileVector(
  tracks: NormalizedTrack[],
): TasteProfileVector {
  const vector = EMPTY_VECTOR();
  if (tracks.length === 0) return vector;

  for (const track of tracks) {
    const weights = inferTrackWeights(track);
    for (const [dim, weight] of Object.entries(weights)) {
      const key = dim as TasteDimension;
      if (TASTE_DIMENSIONS.includes(key)) {
        vector[key] += weight ?? 0;
      }
    }
  }

  return vector;
}

export function cosineSimilarity(
  vectorA: TasteProfileVector,
  vectorB: TasteProfileVector,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const dim of TASTE_DIMENSIONS) {
    const a = vectorA[dim];
    const b = vectorB[dim];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export type BlendedMatchScores = {
  overlapScore: number;
  semanticScore: number;
  textOverlapScore: number;
};

const SEMANTIC_WEIGHT = 0.75;
const TEXT_WEIGHT = 0.25;

export function blendMatchScores(
  semanticSimilarity: number,
  textOverlapRatio: number,
): BlendedMatchScores {
  const semanticScore = Math.round(semanticSimilarity * 100);
  const textOverlapScore = Math.round(textOverlapRatio * 100);
  const overlapScore = Math.round(
    semanticScore * SEMANTIC_WEIGHT + textOverlapScore * TEXT_WEIGHT,
  );

  return {
    overlapScore: Math.min(100, Math.max(0, overlapScore)),
    semanticScore,
    textOverlapScore,
  };
}
