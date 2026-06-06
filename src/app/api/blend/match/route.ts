import { NextResponse } from "next/server";

import {
  computeTrackOverlap,
  parseMemberTracks,
} from "@/lib/match-tracks";
import { prisma } from "@/lib/prisma";
import { buildSonicDna } from "@/lib/sonic-dna";
import type { MatchBlendRequest, MatchBlendResponse } from "@/types/blend";

export async function POST(request: Request) {
  try {
    let body: MatchBlendRequest;

    try {
      body = (await request.json()) as MatchBlendRequest;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const blendId = body.blendId?.trim();
    if (!blendId) {
      return NextResponse.json(
        { error: "blendId is required" },
        { status: 400 },
      );
    }

    const blend = await prisma.blend.findUnique({
      where: { id: blendId },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!blend) {
      return NextResponse.json({ error: "Blend not found" }, { status: 404 });
    }

    if (blend.members.length < 2) {
      return NextResponse.json(
        {
          error:
            "This blend needs two participants with imported track lists before matching.",
          overlapScore: 0,
          semanticScore: 0,
          textOverlapScore: 0,
          matchCount: 0,
          matchingTracks: [],
          sharedArtists: [],
          memberTrackCounts: [0, 0] as [number, number],
          sonicDna: [],
        },
        { status: 422 },
      );
    }

    const [memberA, memberB] = blend.members;
    const tracksA = parseMemberTracks(memberA.tracks);
    const tracksB = parseMemberTracks(memberB.tracks);

    if (tracksA.length === 0 && tracksB.length === 0) {
      return NextResponse.json(
        {
          error: "Both members are missing track lists. Import playlists first.",
          overlapScore: 0,
          semanticScore: 0,
          textOverlapScore: 0,
          matchCount: 0,
          matchingTracks: [],
          sharedArtists: [],
          memberTrackCounts: [0, 0] as [number, number],
          sonicDna: [],
        },
        { status: 422 },
      );
    }

    if (tracksA.length === 0 || tracksB.length === 0) {
      const emptySide = tracksA.length === 0 ? "first" : "second";
      await prisma.blend.update({
        where: { id: blendId },
        data: { overlapScore: 0 },
      });

      const response: MatchBlendResponse = {
        blendId,
        overlapScore: 0,
        semanticScore: 0,
        textOverlapScore: 0,
        matchCount: 0,
        matchingTracks: [],
        sharedArtists: [],
        memberTrackCounts: [tracksA.length, tracksB.length],
        sonicDna: [],
      };

      return NextResponse.json(
        {
          ...response,
          warning: `The ${emptySide} member has no tracks imported yet.`,
        },
        { status: 200 },
      );
    }

    const result = computeTrackOverlap(tracksA, tracksB);

    await prisma.blend.update({
      where: { id: blendId },
      data: { overlapScore: result.overlapScore },
    });

    const response: MatchBlendResponse = {
      blendId,
      overlapScore: result.overlapScore,
      semanticScore: result.semanticScore,
      textOverlapScore: result.textOverlapScore,
      matchCount: result.matchCount,
      matchingTracks: result.matchingTracks,
      sharedArtists: result.sharedArtists,
      memberTrackCounts: result.memberTrackCounts,
      sonicDna: buildSonicDna(tracksA, tracksB),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[blend/match]", error);

    const message =
      error instanceof Error ? error.message : "Failed to compute blend match";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
