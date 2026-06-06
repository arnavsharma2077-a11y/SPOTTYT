import type { NormalizedTrack } from "@/types/blend";

import {
  buildPlayableCandidate,
  dedupeCandidatesByStreamId,
  finalizePlayableTracks,
  parseDurationMs,
  type PlayableTrackCandidate,
  type PlayabilityMetadata,
} from "./playable-track-filter";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 20_000;

function browserHeaders(url: string): HeadersInit {
  const origin = new URL(url).origin;

  return {
    "User-Agent": BROWSER_USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Referer: `${origin}/`,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: browserHeaders(url),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist page (${response.status})`);
    }

    return response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Spotify request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type SpotifyNextTrack = {
  title?: string;
  subtitle?: string;
  entityType?: string;
  uri?: string;
  duration?: number;
  isPlayable?: boolean;
  playabilityReason?: string;
};

type SpotifyNextEntity = {
  id?: string;
  name?: string;
  trackList?: SpotifyNextTrack[];
};

export function parseSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = trimmed.match(
    /open\.spotify\.com\/(?:embed\/)?playlist\/([a-zA-Z0-9]+)/,
  );
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9]{10,}$/.test(trimmed)) return trimmed;

  return null;
}

export function buildSpotifyPlaylistUrl(playlistId: string): string {
  return `https://open.spotify.com/playlist/${playlistId}`;
}

export function buildSpotifyEmbedUrl(playlistId: string): string {
  return `https://open.spotify.com/embed/playlist/${playlistId}`;
}

function extractNextDataJson(html: string): unknown | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;

  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
}

function getEntityFromNextData(data: unknown): SpotifyNextEntity | null {
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const pageProps = (root.props as Record<string, unknown> | undefined)
    ?.pageProps as Record<string, unknown> | undefined;
  const state = pageProps?.state as Record<string, unknown> | undefined;
  const entity = state?.data as Record<string, unknown> | undefined;
  const playlist = entity?.entity as SpotifyNextEntity | undefined;

  return playlist ?? null;
}

function playabilityFromSpotifyTrack(
  track: SpotifyNextTrack,
): PlayabilityMetadata {
  return {
    streamId: track.uri,
    durationMs: parseDurationMs(track.duration, "ms"),
    isPlayable: track.isPlayable,
    playabilityReason: track.playabilityReason,
  };
}

function isStructurallyPlayableSpotifyTrack(track: SpotifyNextTrack): boolean {
  if (!track.title?.trim()) return false;

  const type = track.entityType?.toLowerCase();
  const isKnownEntity =
    type === "track" ||
    type === "episode" ||
    track.uri?.includes("spotify:track:") ||
    track.uri?.includes("spotify:episode:");

  if (!isKnownEntity && type) return false;

  const meta = playabilityFromSpotifyTrack(track);
  if (meta.isPlayable === false) return false;
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
    !streamId.startsWith("spotify:track:") &&
    !streamId.startsWith("spotify:episode:")
  ) {
    return false;
  }

  return true;
}

function candidateFromSpotifyTrack(
  track: SpotifyNextTrack,
): PlayableTrackCandidate | null {
  const name = track.title!.trim();
  const artist = track.subtitle?.trim() ?? "";

  return buildPlayableCandidate({
    ...playabilityFromSpotifyTrack(track),
    name,
    artist,
  });
}

function collectTrackListsFromJson(
  value: unknown,
  lists: SpotifyNextTrack[][],
  depth = 0,
): void {
  if (!value || typeof value !== "object" || depth > 30) return;

  if (Array.isArray(value)) {
    for (const item of value) collectTrackListsFromJson(item, lists, depth + 1);
    return;
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.trackList) && record.trackList.length > 0) {
    lists.push(record.trackList as SpotifyNextTrack[]);
  }

  for (const nested of Object.values(record)) {
    collectTrackListsFromJson(nested, lists, depth + 1);
  }
}

function candidatesFromNextData(data: unknown): PlayableTrackCandidate[] {
  const entity = getEntityFromNextData(data);
  const playlistName = entity?.name?.trim().toLowerCase() ?? "";
  const trackLists: SpotifyNextTrack[][] = [];

  if (entity?.trackList?.length) {
    trackLists.push(entity.trackList);
  }

  collectTrackListsFromJson(data, trackLists);

  const candidates: PlayableTrackCandidate[] = [];

  for (const list of trackLists) {
    for (const track of list) {
      if (!isStructurallyPlayableSpotifyTrack(track)) continue;

      const name = track.title!.trim();
      if (playlistName && name.toLowerCase() === playlistName) continue;

      const candidate = candidateFromSpotifyTrack(track);
      if (candidate) candidates.push(candidate);
    }
  }

  return dedupeCandidatesByStreamId(candidates);
}

function parseCandidatesFromHtml(html: string): PlayableTrackCandidate[] {
  const nextData = extractNextDataJson(html);
  if (!nextData) return [];
  return candidatesFromNextData(nextData);
}

function mergeCandidates(
  ...sources: PlayableTrackCandidate[][]
): PlayableTrackCandidate[] {
  return dedupeCandidatesByStreamId(sources.flat());
}

export async function scrapeSpotifyPlaylist(
  playlistInput: string,
  playlistId: string,
): Promise<NormalizedTrack[]> {
  const candidateUrls = [
    buildSpotifyEmbedUrl(playlistId),
    buildSpotifyPlaylistUrl(playlistId),
    playlistInput.startsWith("http") ? playlistInput : null,
  ].filter((url): url is string => Boolean(url));

  const uniqueUrls = [...new Set(candidateUrls)];
  let lastError: Error | null = null;
  let allCandidates: PlayableTrackCandidate[] = [];

  for (const url of uniqueUrls) {
    try {
      const html = await fetchHtml(url);
      const candidates = parseCandidatesFromHtml(html);
      allCandidates = mergeCandidates(allCandidates, candidates);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Failed to fetch playlist");
    }
  }

  const tracks = finalizePlayableTracks(allCandidates);
  if (tracks.length > 0) return tracks;

  if (lastError) throw lastError;

  const hadUnplayable = allCandidates.length > 0;
  throw new Error(
    hadUnplayable
      ? "No playable tracks found after filtering unplayable or incomplete entries."
      : "No tracks found in playlist HTML. The playlist may be private or unavailable.",
  );
}
