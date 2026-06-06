import type { NormalizedTrack } from "@/types/blend";

import {
  blendMatchScores,
  buildTasteProfileVector,
  cosineSimilarity,
} from "./taste-profile";

const FUZZY_MATCH_THRESHOLD = 0.8;

export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);

    for (let j = start; j < end; j += 1) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k += 1;
    if (a[i] !== b[k]) transpositions += 1;
    k += 1;
  }

  const transpositionCount = transpositions / 2;
  return (
    (matches / a.length +
      matches / b.length +
      (matches - transpositionCount) / matches) /
    3
  );
}

export function jaroWinklerSimilarity(a: string, b: string): number {
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);

  if (!left || !right) return left === right ? 1 : 0;

  const jaro = jaroSimilarity(left, right);
  if (jaro <= 0.7) return jaro;

  let prefixLength = 0;
  const maxPrefix = Math.min(4, left.length, right.length);
  while (
    prefixLength < maxPrefix &&
    left[prefixLength] === right[prefixLength]
  ) {
    prefixLength += 1;
  }

  return jaro + prefixLength * 0.1 * (1 - jaro);
}

export function tracksFuzzyMatch(
  trackA: NormalizedTrack,
  trackB: NormalizedTrack,
): boolean {
  const titleSimilarity = jaroWinklerSimilarity(trackA.name, trackB.name);
  const artistSimilarity = jaroWinklerSimilarity(trackA.artist, trackB.artist);

  return (
    titleSimilarity > FUZZY_MATCH_THRESHOLD &&
    artistSimilarity > FUZZY_MATCH_THRESHOLD
  );
}

export function splitArtists(artistField: string): string[] {
  return artistField
    .split(/,|&|\band\b/gi)
    .map((artist) => normalizeForMatch(artist))
    .filter(Boolean);
}

export type TrackMatchResult = {
  overlapScore: number;
  semanticScore: number;
  textOverlapScore: number;
  matchingTracks: Array<{ name: string; artist: string }>;
  sharedArtists: string[];
  matchCount: number;
  memberTrackCounts: [number, number];
};

function findFuzzyMatches(
  tracksA: NormalizedTrack[],
  tracksB: NormalizedTrack[],
): Array<{ trackA: NormalizedTrack; trackB: NormalizedTrack }> {
  const pairs: Array<{
    indexA: number;
    indexB: number;
    score: number;
  }> = [];

  for (let indexA = 0; indexA < tracksA.length; indexA += 1) {
    const trackA = tracksA[indexA];
    for (let indexB = 0; indexB < tracksB.length; indexB += 1) {
      const trackB = tracksB[indexB];
      if (!tracksFuzzyMatch(trackA, trackB)) continue;

      const score =
        jaroWinklerSimilarity(trackA.name, trackB.name) +
        jaroWinklerSimilarity(trackA.artist, trackB.artist);

      pairs.push({ indexA, indexB, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const matches: Array<{ trackA: NormalizedTrack; trackB: NormalizedTrack }> =
    [];

  for (const pair of pairs) {
    if (usedA.has(pair.indexA) || usedB.has(pair.indexB)) continue;
    usedA.add(pair.indexA);
    usedB.add(pair.indexB);
    matches.push({
      trackA: tracksA[pair.indexA],
      trackB: tracksB[pair.indexB],
    });
  }

  return matches;
}

export function computeTrackOverlap(
  tracksA: NormalizedTrack[],
  tracksB: NormalizedTrack[],
): TrackMatchResult {
  const emptyResult: TrackMatchResult = {
    overlapScore: 0,
    semanticScore: 0,
    textOverlapScore: 0,
    matchingTracks: [],
    sharedArtists: [],
    matchCount: 0,
    memberTrackCounts: [tracksA.length, tracksB.length],
  };

  if (tracksA.length === 0 || tracksB.length === 0) {
    return emptyResult;
  }

  const fuzzyMatches = findFuzzyMatches(tracksA, tracksB);
  const matchingTracks = fuzzyMatches.map(({ trackA }) => ({
    name: trackA.name,
    artist: trackA.artist,
  }));

  const matchCount = matchingTracks.length;
  const unionSize = tracksA.length + tracksB.length - matchCount;
  const textOverlapRatio = unionSize === 0 ? 0 : matchCount / unionSize;

  const profileA = buildTasteProfileVector(tracksA);
  const profileB = buildTasteProfileVector(tracksB);
  const semanticSimilarity = cosineSimilarity(profileA, profileB);
  const scores = blendMatchScores(semanticSimilarity, textOverlapRatio);

  const artistsA = collectArtistCounts(tracksA);
  const artistsB = collectArtistCounts(tracksB);

  const sharedArtists = [...artistsA.keys()]
    .filter((artist) => artistsB.has(artist))
    .sort((a, b) => {
      const scoreA = artistsA.get(a)! + artistsB.get(a)!;
      const scoreB = artistsA.get(b)! + artistsB.get(b)!;
      return scoreB - scoreA || a.localeCompare(b);
    })
    .slice(0, 5)
    .map((normalized) => displayArtistName(normalized, tracksA, tracksB));

  return {
    overlapScore: scores.overlapScore,
    semanticScore: scores.semanticScore,
    textOverlapScore: scores.textOverlapScore,
    matchingTracks,
    sharedArtists,
    matchCount,
    memberTrackCounts: [tracksA.length, tracksB.length],
  };
}

function collectArtistCounts(tracks: NormalizedTrack[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const track of tracks) {
    const artists = splitArtists(track.artist);
    for (const artist of artists) {
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
  }

  return counts;
}

function displayArtistName(
  normalizedArtist: string,
  tracksA: NormalizedTrack[],
  tracksB: NormalizedTrack[],
): string {
  for (const track of [...tracksA, ...tracksB]) {
    for (const artist of splitArtists(track.artist)) {
      if (artist === normalizedArtist) {
        const original = track.artist
          .split(/,|&|\band\b/gi)
          .map((part) => part.trim())
          .find((part) => normalizeForMatch(part) === normalizedArtist);
        if (original) return original;
      }
    }
  }

  return normalizedArtist;
}

export function parseMemberTracks(raw: unknown): NormalizedTrack[] {
  if (!raw || typeof raw !== "object") return [];

  const payload = raw as { tracks?: unknown };
  if (!Array.isArray(payload.tracks)) return [];

  return payload.tracks
    .filter(
      (track): track is NormalizedTrack =>
        Boolean(track) &&
        typeof track === "object" &&
        typeof (track as NormalizedTrack).name === "string" &&
        typeof (track as NormalizedTrack).artist === "string",
    )
    .map((track) => ({
      name: track.name,
      artist: track.artist,
      normalizedName: normalizeForMatch(track.name),
      normalizedArtist: normalizeForMatch(track.artist),
    }));
}
