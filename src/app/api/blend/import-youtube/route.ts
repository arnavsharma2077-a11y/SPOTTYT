import { NextResponse } from "next/server";

import {
  resolveBlendMember,
  resolveUserId,
} from "@/lib/blend-import-session";
import { prisma } from "@/lib/prisma";
import {
  parseYouTubePlaylistId,
  scrapeYouTubePlaylist,
} from "@/lib/youtube-scraper";
import type {
  BlendMemberTracks,
  ImportPlaylistRequest,
  ImportPlaylistResponse,
} from "@/types/blend";

function buildYouTubePlaylistUrl(playlistId: string): string {
  return `https://music.youtube.com/playlist?list=${playlistId}`;
}

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

    const playlistId = parseYouTubePlaylistId(playlistInput);
    if (!playlistId) {
      return NextResponse.json(
        {
          error:
            "Invalid YouTube Music playlist URL. Expected music.youtube.com/playlist?list=… or youtube.com/playlist?list=…",
        },
        { status: 400 },
      );
    }

    const tracks = await scrapeYouTubePlaylist(playlistInput, playlistId);

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
      "youtube",
    );

    const canonicalUrl = buildYouTubePlaylistUrl(playlistId);

    const tracksPayload: BlendMemberTracks = {
      source: "youtube",
      playlistId,
      playlistUrl: canonicalUrl,
      importedAt: new Date().toISOString(),
      count: tracks.length,
      tracks,
    };

    await prisma.blendMember.update({
      where: { id: memberId },
      data: {
        platform: "youtube",
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
    console.error("[import-youtube]", error);

    const message =
      error instanceof Error ? error.message : "Failed to import playlist";

    const status = message.includes("not found")
      ? 404
      : message.includes("Invalid")
        ? 400
        : message.includes("No tracks") || message.includes("Could not parse")
          ? 422
          : message.includes("private")
            ? 422
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
