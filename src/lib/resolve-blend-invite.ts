import { prisma } from "@/lib/prisma";
import type { BlendMemberTracks } from "@/types/blend";

export type ResolvedInvite = {
  blendId: string;
  blendName: string;
  memberCount: number;
};

export type BlendSessionState = {
  blendId: string;
  blendName: string;
  creatorMemberId: string;
  importedPlaylistCount: number;
  memberCount: number;
  creatorPlatform: "spotify" | "youtube" | null;
  creatorTrackCount: number;
  isAwaitingFriend: boolean;
};

function memberTrackCount(tracks: unknown): number {
  if (!tracks || typeof tracks !== "object") {
    return 0;
  }

  const payload = tracks as BlendMemberTracks;
  return payload.count ?? payload.tracks?.length ?? 0;
}

function memberHasPlaylist(tracks: unknown): boolean {
  return memberTrackCount(tracks) > 0;
}

async function findBlendByInviteId(inviteId: string) {
  const member = await prisma.blendMember.findUnique({
    where: { id: inviteId },
    include: { blend: { include: { members: true } } },
  });
  if (member) {
    return member.blend;
  }

  const blend = await prisma.blend.findUnique({
    where: { id: inviteId },
    include: { members: true },
  });
  if (blend) {
    return blend;
  }

  return prisma.blend.findFirst({
    where: { creatorId: inviteId },
    orderBy: { createdAt: "desc" },
    include: { members: true },
  });
}

export async function resolveBlendSession(
  inviteId: string,
): Promise<BlendSessionState | null> {
  const blend = await findBlendByInviteId(inviteId.trim());
  if (!blend) {
    return null;
  }

  const members = [...blend.members].sort(
    (left, right) => left.joinedAt.getTime() - right.joinedAt.getTime(),
  );

  if (members.length === 0) {
    return null;
  }

  const creatorMember = members[0];
  const importedPlaylistCount = members.filter((member) =>
    memberHasPlaylist(member.tracks),
  ).length;

  return {
    blendId: blend.id,
    blendName: blend.name,
    creatorMemberId: creatorMember.id,
    importedPlaylistCount,
    memberCount: members.length,
    creatorPlatform:
      creatorMember.platform === "spotify" ||
      creatorMember.platform === "youtube"
        ? creatorMember.platform
        : null,
    creatorTrackCount: memberTrackCount(creatorMember.tracks),
    isAwaitingFriend: importedPlaylistCount === 1,
  };
}

export async function resolveBlendInvite(
  inviteId: string,
): Promise<ResolvedInvite | null> {
  const session = await resolveBlendSession(inviteId);
  if (!session) {
    return null;
  }

  return {
    blendId: session.blendId,
    blendName: session.blendName,
    memberCount: session.memberCount,
  };
}

export async function ensureJoinMember(blendId: string): Promise<string> {
  const blend = await prisma.blend.findUnique({
    where: { id: blendId },
    include: { members: { orderBy: { joinedAt: "asc" } } },
  });

  if (!blend) {
    throw new Error("Blend not found");
  }

  if (blend.members.length >= 2) {
    return blend.members[1].id;
  }

  const joinEmail = `guest-join-${blendId}@cross-platform-blend.local`;
  const joinUser = await prisma.user.upsert({
    where: { email: joinEmail },
    update: {},
    create: {
      name: "Guest B",
      email: joinEmail,
    },
  });

  const member = await prisma.blendMember.create({
    data: {
      blendId,
      userId: joinUser.id,
      platform: "spotify",
    },
  });

  return member.id;
}
