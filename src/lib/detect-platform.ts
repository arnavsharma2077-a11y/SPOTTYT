export type PlaylistPlatform = "spotify" | "youtube" | "unknown";

export function detectPlaylistPlatform(url: string): PlaylistPlatform {
  const trimmed = url.trim().toLowerCase();

  if (
    trimmed.includes("open.spotify.com/playlist") ||
    trimmed.includes("spotify:playlist:")
  ) {
    return "spotify";
  }

  if (
    trimmed.includes("music.youtube.com/playlist") ||
    trimmed.includes("youtube.com/playlist") ||
    trimmed.includes("youtu.be")
  ) {
    return "youtube";
  }

  return "unknown";
}
