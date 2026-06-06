import type { NormalizedTrack } from "@/types/blend";

import { normalizeTrackString } from "./normalize";

export type PlayabilityMetadata = {
  streamId?: string | null;
  durationMs?: number | null;
  isPlayable?: boolean | null;
  isLive?: boolean;
  isUpcoming?: boolean;
  playabilityReason?: string | null;
};

export type PlayableTrackCandidate = {
  name: string;
  artist: string;
  streamId: string;
  durationMs: number;
};

const YOUTUBE_VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const SPOTIFY_TRACK_URI_PATTERN = /^spotify:track:[a-zA-Z0-9]+$/;
const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;

export function parseDurationMs(
  value: number | string | null | undefined,
  unit: "ms" | "seconds" = "ms",
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric =
    typeof value === "string" ? Number.parseInt(value, 10) : value;

  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  return unit === "seconds" ? Math.round(numeric * 1000) : Math.round(numeric);
}

export function isValidYouTubeStreamId(streamId: string | null | undefined): boolean {
  if (!streamId?.trim()) return false;
  return YOUTUBE_VIDEO_ID_PATTERN.test(streamId.trim());
}

export function isValidSpotifyStreamId(streamId: string | null | undefined): boolean {
  if (!streamId?.trim()) return false;
  const trimmed = streamId.trim();
  if (SPOTIFY_TRACK_URI_PATTERN.test(trimmed)) return true;
  return SPOTIFY_TRACK_ID_PATTERN.test(trimmed);
}

export function normalizeSpotifyStreamId(streamId: string): string {
  const trimmed = streamId.trim();
  if (SPOTIFY_TRACK_URI_PATTERN.test(trimmed)) return trimmed;
  if (SPOTIFY_TRACK_ID_PATTERN.test(trimmed)) {
    return `spotify:track:${trimmed}`;
  }
  return trimmed;
}

export function passesPlayabilityFilter(meta: PlayabilityMetadata): boolean {
  if (meta.isPlayable === false) return false;
  if (meta.isLive === true) return false;
  if (meta.isUpcoming === true) return false;

  if (
    meta.playabilityReason &&
    meta.playabilityReason.toUpperCase() !== "PLAYABLE"
  ) {
    return false;
  }

  const durationMs = parseDurationMs(meta.durationMs ?? null, "ms");
  if (durationMs === null) return false;

  const streamId = meta.streamId?.trim() ?? "";
  if (
    !isValidYouTubeStreamId(streamId) &&
    !isValidSpotifyStreamId(streamId)
  ) {
    return false;
  }

  return true;
}

export function candidateToNormalizedTrack(
  candidate: PlayableTrackCandidate,
): NormalizedTrack {
  return {
    name: candidate.name,
    artist: candidate.artist,
    normalizedName: normalizeTrackString(candidate.name),
    normalizedArtist: normalizeTrackString(candidate.artist),
  };
}

export function dedupeCandidatesByStreamId(
  candidates: PlayableTrackCandidate[],
): PlayableTrackCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.streamId.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function finalizePlayableTracks(
  candidates: PlayableTrackCandidate[],
): NormalizedTrack[] {
  const playable = candidates.filter((candidate) =>
    passesPlayabilityFilter({
      streamId: candidate.streamId,
      durationMs: candidate.durationMs,
      isPlayable: true,
    }),
  );

  return dedupeCandidatesByStreamId(playable).map(candidateToNormalizedTrack);
}

export function buildPlayableCandidate(
  meta: PlayabilityMetadata & { name: string; artist: string },
): PlayableTrackCandidate | null {
  if (!passesPlayabilityFilter(meta)) return null;

  const name = meta.name.trim();
  const artist = meta.artist.trim();
  if (!name || !artist) return null;

  const durationMs = parseDurationMs(meta.durationMs ?? null, "ms");
  const streamId = meta.streamId?.trim() ?? "";
  if (durationMs === null) return null;

  const normalizedStreamId = isValidSpotifyStreamId(streamId)
    ? normalizeSpotifyStreamId(streamId)
    : streamId;

  return {
    name,
    artist,
    streamId: normalizedStreamId,
    durationMs,
  };
}
