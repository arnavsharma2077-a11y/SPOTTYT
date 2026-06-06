export type BlendTag = {
  headline: string;
  subtitle: string;
};

export function getDynamicBlendTag(overlapScore: number): BlendTag {
  if (overlapScore >= 90) {
    return {
      headline: "Sonic Soulmates",
      subtitle: "Your libraries are practically the same wavelength.",
    };
  }

  if (overlapScore >= 75) {
    return {
      headline: "Harmonic Partners",
      subtitle: "Strong overlap with room for delightful surprises.",
    };
  }

  if (overlapScore >= 60) {
    return {
      headline: "Same Vibe, Different Playlists",
      subtitle: "You share a pulse, even when the tracklists diverge.",
    };
  }

  return {
    headline: "We are a Chaotic Duo",
    subtitle: "Opposite corners of the algorithm — and proud of it.",
  };
}
