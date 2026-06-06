export const BLEND_CREATOR_STORAGE_PREFIX = "blend-creator:";

export function markBlendCreator(blendId: string, memberId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(`${BLEND_CREATOR_STORAGE_PREFIX}${blendId}`, memberId);
}

export function isBlendCreatorSession(
  blendId: string,
  inviteId: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    sessionStorage.getItem(`${BLEND_CREATOR_STORAGE_PREFIX}${blendId}`) ===
    inviteId
  );
}

export function buildBlendInviteUrl(memberId: string): string {
  if (typeof window === "undefined") {
    return `/join/${memberId}`;
  }

  return `${window.location.origin}/join/${memberId}`;
}
