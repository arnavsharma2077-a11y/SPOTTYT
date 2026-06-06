"use client";

import { Check, Copy, Link2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ResultsDashboard from "@/components/join/ResultsDashboard";
import { SpotifyIcon, YouTubeIcon } from "@/components/icons/PlatformIcons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildBlendInviteUrl,
  isBlendCreatorSession,
  markBlendCreator,
} from "@/lib/blend-creator-session";
import { detectPlaylistPlatform } from "@/lib/detect-platform";
import type { BlendSessionState } from "@/lib/resolve-blend-invite";
import { cn } from "@/lib/utils";
import type { MatchBlendResponse } from "@/types/blend";

type JoinBlendFlowProps = {
  inviteId: string;
  session: BlendSessionState;
  onOverlapScoreChange?: (score: number | null) => void;
};

type FlowPhase = "boot" | "invite" | "join" | "loading" | "results";

export default function JoinBlendFlow({
  inviteId,
  session,
  onOverlapScoreChange,
}: JoinBlendFlowProps) {
  const searchParams = useSearchParams();
  const matchStartedRef = useRef(false);
  const [phase, setPhase] = useState<FlowPhase>("boot");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState("Importing playlist…");
  const [matchResult, setMatchResult] = useState<MatchBlendResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(
    () => buildBlendInviteUrl(session.creatorMemberId),
    [session.creatorMemberId],
  );

  const platform = detectPlaylistPlatform(playlistUrl);

  useEffect(() => {
    if (phase === "results" && matchResult) {
      onOverlapScoreChange?.(matchResult.overlapScore);
      return;
    }

    onOverlapScoreChange?.(null);
  }, [phase, matchResult, onOverlapScoreChange]);

  useEffect(() => {
    if (searchParams.get("role") === "creator") {
      markBlendCreator(session.blendId, session.creatorMemberId);
    }

    const isCreatorViewer =
      inviteId === session.creatorMemberId &&
      (searchParams.get("role") === "creator" ||
        isBlendCreatorSession(session.blendId, inviteId));

    if (session.importedPlaylistCount >= 2) {
      if (!matchStartedRef.current) {
        matchStartedRef.current = true;
        void runMatch();
      }
      return;
    }

    if (session.isAwaitingFriend && isCreatorViewer) {
      setPhase("invite");
      return;
    }

    setPhase("join");
  }, [inviteId, searchParams, session]);

  async function runMatch() {
    setError("");
    setPhase("loading");
    setLoadingLabel("Calculating your blend match…");

    try {
      const matchResponse = await fetch("/api/blend/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blendId: session.blendId }),
      });

      const matchData = await matchResponse.json();
      if (!matchResponse.ok) {
        throw new Error(matchData.error ?? "Failed to calculate match");
      }

      setMatchResult(matchData as MatchBlendResponse);
      setPhase("results");
    } catch (err) {
      const isCreatorViewer =
        inviteId === session.creatorMemberId &&
        (searchParams.get("role") === "creator" ||
          isBlendCreatorSession(session.blendId, inviteId));

      setPhase(
        session.isAwaitingFriend && isCreatorViewer ? "invite" : "join",
      );
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCalculateMatch() {
    setError("");

    if (!playlistUrl.trim()) {
      setError("Paste a playlist URL to continue.");
      return;
    }

    if (platform === "unknown") {
      setError("Enter a valid Spotify or YouTube Music playlist URL.");
      return;
    }

    setPhase("loading");
    setLoadingLabel("Importing your playlist…");

    try {
      const importEndpoint =
        platform === "youtube"
          ? "/api/blend/import-youtube"
          : "/api/blend/import-spotify";

      const importResponse = await fetch(importEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistUrl,
          inviteId: session.creatorMemberId,
        }),
      });

      const importData = await importResponse.json();
      if (!importResponse.ok) {
        throw new Error(importData.error ?? "Failed to import playlist");
      }

      await runMatch();
    } catch (err) {
      setPhase("join");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (phase === "boot" || phase === "loading") {
    return (
      <div className="flex min-h-[420px] w-full max-w-lg flex-col items-center justify-center text-center">
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-zinc-800" />
          <div className="absolute inset-0 animate-ping rounded-full border border-emerald-500/20" />
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        </div>
        <p className="text-lg font-medium text-white">
          {phase === "boot" ? "Loading your blend…" : loadingLabel}
        </p>
        {phase === "loading" && (
          <p className="mt-2 text-sm text-zinc-500">
            Syncing libraries and finding overlap…
          </p>
        )}
      </div>
    );
  }

  if (phase === "results" && matchResult) {
    return (
      <ResultsDashboard result={matchResult} blendName={session.blendName} />
    );
  }

  if (phase === "invite") {
    return (
      <Card className="w-full max-w-lg overflow-hidden border-white/10 bg-white/10 backdrop-blur-md">
        <CardHeader className="border-b border-white/10 pb-5 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/20">
              <Link2 className="h-5 w-5 text-violet-300" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Invite Your Friend</CardTitle>
          <CardDescription className="text-base text-zinc-400">
            Your playlist is locked in. Send this link so they can add theirs and
            complete the blend.
          </CardDescription>
          <p className="pt-2 text-xs text-zinc-500">
            {session.creatorTrackCount} tracks imported from{" "}
            <span className="capitalize text-zinc-300">
              {session.creatorPlatform ?? "your library"}
            </span>
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-left text-xs uppercase tracking-[0.28em] text-zinc-500">
              Shareable invite link
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteUrl}
                aria-label="Invite link"
                className="border-white/10 bg-black/30 font-mono text-xs text-zinc-200 sm:text-sm"
              />
              <Button
                type="button"
                variant="copy"
                size="icon"
                onClick={handleCopyInvite}
                aria-label={copied ? "Copied" : "Copy invite link"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="h-12 w-full bg-white text-black hover:bg-zinc-200"
            onClick={handleCopyInvite}
          >
            {copied ? "Invite Link Copied!" : "Copy Invite Link"}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Waiting for your friend to paste their playlist on this link.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg overflow-hidden">
      <CardHeader className="border-b border-zinc-800/80 pb-5 text-center sm:text-left">
        <div className="mb-3 flex justify-center sm:justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Join the Blend</CardTitle>
        <CardDescription className="text-base text-zinc-400">
          You&apos;ve been invited to sync music tastes!
        </CardDescription>
        <p className="pt-2 text-xs text-zinc-600">
          Joining <span className="text-zinc-400">{session.blendName}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="space-y-3">
          <label
            htmlFor="join-playlist-url"
            className="text-left text-sm font-medium text-zinc-300"
          >
            Your playlist URL
          </label>
          <Input
            id="join-playlist-url"
            type="url"
            placeholder="Spotify or YouTube Music playlist link"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            className="border-zinc-800"
          />
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-600 sm:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <SpotifyIcon className="h-3.5 w-3.5 text-emerald-400" />
              Spotify
            </span>
            <span className="inline-flex items-center gap-1.5">
              <YouTubeIcon className="h-3.5 w-3.5 text-red-400" />
              YouTube Music
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button
          type="button"
          className={cn(
            "h-12 w-full bg-white text-black hover:bg-zinc-200",
            platform === "spotify" &&
              "bg-emerald-500 text-black hover:bg-emerald-400",
            platform === "youtube" &&
              "bg-red-500 text-white hover:bg-red-400",
          )}
          disabled={!playlistUrl.trim()}
          onClick={handleCalculateMatch}
        >
          Calculate Match
        </Button>

        <p className="text-center text-xs text-zinc-600">
          <Link href="/" className="text-zinc-400 underline-offset-4 hover:underline">
            Start your own blend
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
