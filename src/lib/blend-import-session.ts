import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureJoinMember,
  resolveBlendInvite,
} from "@/lib/resolve-blend-invite";

const GUEST_EMAIL = "guest@cross-platform-blend.local";

export async function resolveUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const guest = await prisma.user.upsert({
    where: { email: GUEST_EMAIL },
    update: {},
    create: {
      name: "Guest",
      email: GUEST_EMAIL,
    },
  });

  return guest.id;
}

export async function resolveBlendMember(
  userId: string,
  blendMemberId?: string,
  inviteId?: string,
  platform: "spotify" | "youtube" = "spotify",
): Promise<{ blendId: string; memberId: string }> {
  if (inviteId) {
    const resolved = await resolveBlendInvite(inviteId);
    if (!resolved) {
      throw new Error("Invite not found");
    }

    const memberId = await ensureJoinMember(resolved.blendId);
    return { blendId: resolved.blendId, memberId };
  }

  if (blendMemberId) {
    const existing = await prisma.blendMember.findUnique({
      where: { id: blendMemberId },
    });

    if (!existing) {
      throw new Error("BlendMember not found");
    }

    return { blendId: existing.blendId, memberId: existing.id };
  }

  const blend = await prisma.blend.create({
    data: {
      name: "My Blend",
      creatorId: userId,
      members: {
        create: {
          userId,
          platform,
        },
      },
    },
    include: { members: true },
  });

  return { blendId: blend.id, memberId: blend.members[0].id };
}
