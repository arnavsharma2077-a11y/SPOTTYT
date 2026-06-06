"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import JoinBlendFlow from "@/components/join/JoinBlendFlow";
import { getBlendPageBackgroundClass } from "@/lib/blend-page-background";
import type { BlendSessionState } from "@/lib/resolve-blend-invite";
import { cn } from "@/lib/utils";

type JoinPageShellProps = {
  inviteId: string;
  session: BlendSessionState;
};

export default function JoinPageShell({
  inviteId,
  session,
}: JoinPageShellProps) {
  const [overlapScore, setOverlapScore] = useState<number | null>(null);
  const isChaotic = overlapScore !== null && overlapScore < 60;

  return (
    <main
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-white transition-[background] duration-700 sm:px-6",
        getBlendPageBackgroundClass(overlapScore),
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          isChaotic
            ? "bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(244,63,94,0.16),transparent_55%),radial-gradient(ellipse_60%_45%_at_85%_90%,rgba(24,24,27,0.35),transparent_50%)]"
            : "bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(ellipse_60%_45%_at_85%_90%,rgba(192,38,211,0.14),transparent_50%)]",
        )}
      />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
        <Link
          href="/"
          className="mb-8 text-[11px] font-medium uppercase tracking-[0.35em] text-zinc-600 transition hover:text-zinc-400"
        >
          Cross-Platform Music Blend
        </Link>

        <Suspense
          fallback={
            <div className="flex min-h-[420px] w-full max-w-lg items-center justify-center text-sm text-zinc-500">
              Loading your blend…
            </div>
          }
        >
          <JoinBlendFlow
            inviteId={inviteId}
            session={session}
            onOverlapScoreChange={setOverlapScore}
          />
        </Suspense>
      </div>
    </main>
  );
}
