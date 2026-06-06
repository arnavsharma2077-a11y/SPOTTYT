import { NextResponse } from "next/server";

import {
  resolveBlendMember,
  resolveUserId,
} from "@/lib/blend-import-session";
import { prisma } from "@/lib/prisma";
import {
  buildSpotifyPlaylistUrl,
  parseSpotifyPlaylistId,
  scrapeSpotifyPlaylist,
} from "@/lib/spotify-scraper";
import type {
  BlendMemberTracks,
  ImportPlaylistRequest,
  ImportPlaylistResponse,
} from "@/types/blend";

export async function POST(request: Request) {
  try {
    let body: ImportPlaylistRequest;

    try {
      body = (await request.json()) as ImportPlaylistRequest;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const playlistInput = body.playlistUrl?.trim();

    if (!playlistInput) {
      return NextResponse.json(
        { error: "playlistUrl is required" },
        { status: 400 },
      );
    }

    const playlistId = parseSpotifyPlaylistId(playlistInput);
    if (!playlistId) {
      return NextResponse.json(
        {
          error:
            "Invalid Spotify playlist URL or ID. Expected open.spotify.com/playlist/…",
        },
        { status: 400 },
      );
    }

    const tracks = await scrapeSpotifyPlaylist(playlistInput, playlistId);

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found for this playlist" },
        { status: 422 },
      );
    }

    const userId = await resolveUserId();
    const { blendId, memberId } = await resolveBlendMember(
      userId,
      body.blendMemberId,
      body.inviteId,
      "spotify",
    );

    const canonicalUrl = buildSpotifyPlaylistUrl(playlistId);

    const tracksPayload: BlendMemberTracks = {
      source: "spotify",
      playlistId,
      playlistUrl: canonicalUrl,
      importedAt: new Date().toISOString(),
      count: tracks.length,
      tracks,
    };

    await prisma.blendMember.update({
      where: { id: memberId },
      data: {
        platform: "spotify",
        playlistUrl: canonicalUrl,
        tracks: tracksPayload,
      },
    });

    const response: ImportPlaylistResponse = {
      blendId,
      blendMemberId: memberId,
      trackCount: tracks.length,
      tracks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[import-spotify]", error);

    const message =
      error instanceof Error ? error.message : "Failed to import playlist";

    const status = message.includes("not found")
      ? 404
      : message.includes("Invalid")
        ? 400
        : message.includes("No tracks")
          ? 422
          : message.includes("DATABASE_URL")
            ? 500
            : message.includes("does not exist")
              ? 503
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
