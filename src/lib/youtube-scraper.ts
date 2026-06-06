import { Innertube } from "youtubei.js";

import {
  buildPlayableCandidate,
  dedupeCandidatesByStreamId,
  finalizePlayableTracks,
  parseDurationMs,
  type PlayableTrackCandidate,
  type PlayabilityMetadata,
} from "@/lib/playable-track-filter";
import type { NormalizedTrack } from "@/types/blend";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_CONTINUATION_PAGES = 50;

export function parseYouTubePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  if (/^(PL|RDCLAK|OLAK|UU|LL)[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;

  return null;
}

function titleToString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value.toString());
  }
  return String(value);
}

function parseVideoTitle(rawTitle: string, channelName: string): {
  name: string;
  artist: string;
} {
  const cleaned = rawTitle.replace(/\s*\(official.*?\)\s*/gi, " ").trim();
  const parts = cleaned.split(" - ");

  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      name: parts.slice(1).join(" - ").trim(),
    };
  }

  return {
    name: cleaned,
    artist: channelName,
  };
}

function parseExpectedTotal(totalItems: string | undefined): number | null {
  if (!totalItems || totalItems === "N/A") return null;
  const parsed = Number.parseInt(totalItems.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type InnertubePlaylistVideo = {
  id?: string;
  title?: unknown;
  author?: { name?: unknown };
  accessibility_label?: string;
  video_info?: unknown;
  type?: string;
  is_playable?: boolean;
  duration?: { seconds?: number; text?: string };
  is_live?: boolean;
  is_upcoming?: boolean;
  upcoming?: Date;
};

function playabilityFromPlaylistVideo(
  video: InnertubePlaylistVideo,
): PlayabilityMetadata {
  return {
    streamId: video.id,
    durationMs: parseDurationMs(video.duration?.seconds, "seconds"),
    isPlayable: video.is_playable,
    isLive: video.is_live,
    isUpcoming: video.is_upcoming || Boolean(video.upcoming),
  };
}

function isPlaylistVideoItem(item: unknown): item is InnertubePlaylistVideo {
  if (!item || typeof item !== "object") return false;
  const video = item as InnertubePlaylistVideo;
  if (video.type && video.type !== "PlaylistVideo") return false;
  return Boolean(video.id && video.title);
}

function passesYouTubePlayability(meta: PlayabilityMetadata): boolean {
  if (meta.isPlayable === false) return false;
  if (meta.isLive === true) return false;
  if (meta.isUpcoming === true) return false;

  const durationMs = parseDurationMs(meta.durationMs ?? null, "ms");
  if (durationMs === null) return false;

  const streamId = meta.streamId?.trim() ?? "";
  if (!streamId || streamId.length !== 11) return false;

  return true;
}

function isStructurallyPlayableVideo(video: InnertubePlaylistVideo): boolean {
  return passesYouTubePlayability(playabilityFromPlaylistVideo(video));
}

function candidateFromPlaylistVideo(
  video: InnertubePlaylistVideo,
): PlayableTrackCandidate | null {
  const rawTitle =
    titleToString(video.title) ||
    video.accessibility_label?.replace(/^\d+\s+/, "").trim() ||
    "";
  if (!rawTitle) return null;

  const channelName =
    titleToString(video.author?.name) || titleToString(video.video_info) || "";

  const { name, artist } = parseVideoTitle(rawTitle, channelName);

  return buildPlayableCandidate({
    ...playabilityFromPlaylistVideo(video),
    name,
    artist,
  });
}

function mergeCandidates(
  ...sources: PlayableTrackCandidate[][]
): PlayableTrackCandidate[] {
  return dedupeCandidatesByStreamId(sources.flat());
}

type InnertubeMusicItem = {
  id?: string;
  title?: unknown;
  subtitle?: unknown;
  author?: { name?: unknown };
  artists?: Array<{ name?: unknown }>;
  type?: string;
  duration?: { seconds?: number; text?: string };
};

function playabilityFromMusicItem(item: InnertubeMusicItem): PlayabilityMetadata {
  return {
    streamId: item.id,
    durationMs: parseDurationMs(item.duration?.seconds, "seconds"),
    isPlayable: true,
  };
}

function isMusicListItem(item: unknown): item is InnertubeMusicItem {
  if (!item || typeof item !== "object") return false;
  const musicItem = item as InnertubeMusicItem;
  if (musicItem.type && musicItem.type !== "MusicResponsiveListItem") {
    return false;
  }
  return Boolean(musicItem.id && musicItem.title);
}

function isStructurallyPlayableMusicItem(item: InnertubeMusicItem): boolean {
  return passesYouTubePlayability(playabilityFromMusicItem(item));
}

function candidateFromMusicItem(
  item: InnertubeMusicItem,
): PlayableTrackCandidate | null {
  const rawTitle = titleToString(item.title);
  if (!rawTitle) return null;

  const artistNames = (item.artists ?? [])
    .map((artist) => titleToString(artist.name))
    .filter(Boolean);

  const channelName =
    artistNames.join(", ") ||
    titleToString(item.subtitle) ||
    titleToString(item.author?.name) ||
    "";

  const { name, artist } = parseVideoTitle(rawTitle, channelName);

  return buildPlayableCandidate({
    ...playabilityFromMusicItem(item),
    name,
    artist,
  });
}

async function fetchMusicPlaylistCandidates(
  playlistId: string,
): Promise<PlayableTrackCandidate[]> {
  const youtube = await Innertube.create({ generate_session_locally: true });
  let playlist = await youtube.music.getPlaylist(playlistId);

  const candidates: PlayableTrackCandidate[] = [];
  const seenIds = new Set<string>();

  const appendPage = () => {
    for (const item of playlist.items) {
      if (!isMusicListItem(item) || !item.id || seenIds.has(item.id)) continue;
      if (!isStructurallyPlayableMusicItem(item)) continue;

      const candidate = candidateFromMusicItem(item);
      if (!candidate) continue;

      seenIds.add(item.id);
      candidates.push(candidate);
    }
  };

  appendPage();

  let pages = 0;
  while (playlist.has_continuation && pages < MAX_CONTINUATION_PAGES) {
    playlist = await playlist.getContinuation();
    appendPage();
    pages += 1;
  }

  return candidates;
}

async function fetchAllPlaylistVideoCandidates(
  playlistId: string,
): Promise<PlayableTrackCandidate[]> {
  const youtube = await Innertube.create({ generate_session_locally: true });
  let playlist = await youtube.getPlaylist(playlistId);

  const candidates: PlayableTrackCandidate[] = [];
  const seenIds = new Set<string>();
  const expectedTotal = parseExpectedTotal(playlist.info?.total_items);

  const appendPage = () => {
    for (const video of playlist.videos) {
      if (!isPlaylistVideoItem(video) || !video.id || seenIds.has(video.id)) {
        continue;
      }
      if (!isStructurallyPlayableVideo(video)) continue;

      const candidate = candidateFromPlaylistVideo(video);
      if (!candidate) continue;

      seenIds.add(video.id);
      candidates.push(candidate);
    }
  };

  appendPage();

  let pages = 0;
  while (playlist.has_continuation && pages < MAX_CONTINUATION_PAGES) {
    playlist = await playlist.getContinuation();
    appendPage();
    pages += 1;

    if (expectedTotal !== null && candidates.length >= expectedTotal) break;
  }

  return candidates;
}

type HtmlTextRenderer = {
  simpleText?: string;
  runs?: { text?: string }[];
};

type HtmlPlaylistVideo = {
  videoId?: string;
  lengthSeconds?: string | number;
  isPlayable?: boolean;
  title?: HtmlTextRenderer;
  shortBylineText?: HtmlTextRenderer;
};

function textFromRenderer(value: HtmlTextRenderer | undefined): string {
  if (!value) return "";
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => run.text ?? "").join("").trim();
  }
  return "";
}

function playabilityFromHtmlRenderer(
  renderer: HtmlPlaylistVideo,
): PlayabilityMetadata {
  return {
    streamId: renderer.videoId,
    durationMs: parseDurationMs(renderer.lengthSeconds, "seconds"),
    isPlayable: renderer.isPlayable ?? true,
  };
}

function candidateFromHtmlRenderer(
  renderer: HtmlPlaylistVideo,
): PlayableTrackCandidate | null {
  const rawTitle = textFromRenderer(renderer.title);
  const channelName = textFromRenderer(renderer.shortBylineText);
  if (!rawTitle) return null;

  const { name, artist } = parseVideoTitle(rawTitle, channelName);

  return buildPlayableCandidate({
    ...playabilityFromHtmlRenderer(renderer),
    name,
    artist,
  });
}

function extractYtInitialData(html: string): unknown | null {
  const patterns = [
    /var ytInitialData\s*=\s*(\{[\s\S]*?\});/,
    /window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/,
    /ytInitialData\s*=\s*(\{[\s\S]*?\});/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      return JSON.parse(match[1]) as unknown;
    } catch {
      continue;
    }
  }

  return null;
}

function findPlaylistVideoRenderers(value: unknown): HtmlPlaylistVideo[] {
  const results: HtmlPlaylistVideo[] = [];

  function walk(node: unknown, depth = 0): void {
    if (!node || typeof node !== "object" || depth > 25) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    const record = node as Record<string, unknown>;

    if (record.playlistVideoRenderer) {
      results.push(record.playlistVideoRenderer as HtmlPlaylistVideo);
    }

    if (record.musicResponsiveListItemRenderer) {
      const musicItem = record.musicResponsiveListItemRenderer as {
        videoId?: string;
        lengthSeconds?: string | number;
        isPlayable?: boolean;
        flexColumns?: Array<{
          musicResponsiveListItemFlexColumnRenderer?: {
            text?: HtmlTextRenderer;
          };
        }>;
      };
      const columns = musicItem.flexColumns ?? [];
      results.push({
        videoId: musicItem.videoId,
        lengthSeconds: musicItem.lengthSeconds,
        isPlayable: musicItem.isPlayable,
        title: columns[0]?.musicResponsiveListItemFlexColumnRenderer?.text,
        shortBylineText: columns[1]?.musicResponsiveListItemFlexColumnRenderer?.text,
      });
    }

    if (record.playlistVideoListRenderer) {
      const contents = (
        record.playlistVideoListRenderer as { contents?: unknown[] }
      ).contents;
      if (Array.isArray(contents)) {
        for (const entry of contents) walk(entry, depth + 1);
      }
    }

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === "object") walk(nested, depth + 1);
    }
  }

  walk(value);
  return results;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page (${response.status})`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapePlaylistCandidatesFromHtml(
  playlistId: string,
): Promise<PlayableTrackCandidate[]> {
  const candidateUrls = [
    `https://www.youtube.com/playlist?list=${playlistId}`,
    `https://music.youtube.com/playlist?list=${playlistId}`,
  ];

  const candidates: PlayableTrackCandidate[] = [];

  for (const url of candidateUrls) {
    try {
      const html = await fetchHtml(url);
      const data = extractYtInitialData(html);
      if (!data) continue;

      for (const renderer of findPlaylistVideoRenderers(data)) {
        const meta = playabilityFromHtmlRenderer(renderer);
        if (!passesYouTubePlayability(meta)) continue;

        const candidate = candidateFromHtmlRenderer(renderer);
        if (candidate) candidates.push(candidate);
      }
    } catch {
      continue;
    }
  }

  return dedupeCandidatesByStreamId(candidates);
}

export async function scrapeYouTubePlaylist(
  playlistInput: string,
  playlistId: string,
): Promise<NormalizedTrack[]> {
  let apiCandidates: PlayableTrackCandidate[] = [];
  let musicCandidates: PlayableTrackCandidate[] = [];

  try {
    apiCandidates = await fetchAllPlaylistVideoCandidates(playlistId);
  } catch {
    apiCandidates = [];
  }

  try {
    musicCandidates = await fetchMusicPlaylistCandidates(playlistId);
  } catch {
    musicCandidates = [];
  }

  const htmlCandidates = await scrapePlaylistCandidatesFromHtml(playlistId);
  const merged = mergeCandidates(apiCandidates, musicCandidates, htmlCandidates);
  const tracks = finalizePlayableTracks(merged);

  if (tracks.length === 0) {
    const hadCandidates = merged.length > 0;
    throw new Error(
      hadCandidates
        ? "No playable tracks found after filtering unplayable or incomplete entries."
        : playlistInput
          ? `Could not parse tracks from playlist URL: ${playlistInput}`
          : "No tracks found for this YouTube playlist. It may be private or unavailable.",
    );
  }

  return tracks;
}
