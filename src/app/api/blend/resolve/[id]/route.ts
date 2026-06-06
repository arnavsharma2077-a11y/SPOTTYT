import { NextResponse } from "next/server";

import { resolveBlendInvite } from "@/lib/resolve-blend-invite";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveBlendInvite(id);

    if (!resolved) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json(resolved);
  } catch (error) {
    console.error("[blend/resolve]", error);
    return NextResponse.json(
      { error: "Failed to resolve invite" },
      { status: 500 },
    );
  }
}
