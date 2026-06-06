export type NormalizedTrack = {
  name: string;
  artist: string;
  normalizedName: string;
  normalizedArtist: string;
};

export type BlendMemberTracks = {
  source: "spotify" | "youtube";
  playlistId: string;
  playlistUrl: string;
  importedAt: string;
  count: number;
  tracks: NormalizedTrack[];
};

export type ImportPlaylistRequest = {
  playlistUrl: string;
  blendMemberId?: string;
  inviteId?: string;
};

export type ImportPlaylistResponse = {
  blendId: string;
  blendMemberId: string;
  trackCount: number;
  tracks: NormalizedTrack[];
};

/** @deprecated Use ImportPlaylistRequest */
export type ImportSpotifyRequest = ImportPlaylistRequest;

/** @deprecated Use ImportPlaylistResponse */
export type ImportSpotifyResponse = ImportPlaylistResponse;

export type MatchBlendRequest = {
  blendId: string;
};

export type SonicDnaDimension = {
  label: string;
  weight: number;
};

export type MatchBlendResponse = {
  blendId: string;
  overlapScore: number;
  semanticScore: number;
  textOverlapScore: number;
  matchCount: number;
  matchingTracks: Array<{ name: string; artist: string }>;
  sharedArtists: string[];
  memberTrackCounts: [number, number];
  sonicDna: SonicDnaDimension[];
};
