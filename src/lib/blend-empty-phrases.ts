export const NO_TRACKS_PHRASES = [
  "0 identical tracks. Your combined playlist contains 100% pure, un-duplicated discovery.",
  "Zero overlapping songs. You two are actively expanding each other's musical horizons.",
  "No duplicate audio files here. Your libraries are perfectly built for a road trip swap.",
  "0 track overlaps. A flawless sonic handoff — one person's playlist ends exactly where the other begins.",
] as const;

export const NO_ARTISTS_PHRASES = [
  "0 shared artists. Your circles don't touch, making you perfect guides into each other's worlds.",
  "Zero common artists. You two live in entirely separate musical constellations.",
  "No shared names found. This isn't an overlap, it's a cross-cultural exchange program.",
  "0 matching creators. You two are proof that opposites attract geometrically.",
] as const;

function hashSeed(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function pickDeterministicPhrase(
  phrases: readonly string[],
  seed: string,
): string {
  if (phrases.length === 0) {
    return "";
  }

  return phrases[hashSeed(seed) % phrases.length];
}

export function pickNoArtistsPhrase(blendId: string): string {
  return pickDeterministicPhrase(NO_ARTISTS_PHRASES, `${blendId}:artists`);
}

export function pickNoTracksPhrase(blendId: string): string {
  return pickDeterministicPhrase(NO_TRACKS_PHRASES, `${blendId}:tracks`);
}
