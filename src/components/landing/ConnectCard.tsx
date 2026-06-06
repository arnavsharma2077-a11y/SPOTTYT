"use client";

import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SpotifyIcon, YouTubeIcon } from "@/components/icons/PlatformIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { detectPlaylistPlatform } from "@/lib/detect-platform";
import {
  buildBlendInviteUrl,
  isBlendCreatorSession,
  markBlendCreator,
} from "@/lib/blend-creator-session";
import { cn } from "@/lib/utils";
import type { ImportPlaylistResponse } from "@/types/blend";

export default function ConnectCard() {
  const router = useRouter();
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [blendMemberId, setBlendMemberId] = useState<string | null>(null);
  const [spotifyImported, setSpotifyImported] = useState(false);
  const [youtubeImported, setYoutubeImported] = useState(false);
  const [spotifyTrackCount, setSpotifyTrackCount] = useState(0);
  const [youtubeTrackCount, setYoutubeTrackCount] = useState(0);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const hasImportedSession = spotifyImported || youtubeImported;

  useEffect(() => {
    if (!blendMemberId) {
      setShowInvite(false);
      setInviteLink("");
      return;
    }

    setInviteLink(buildBlendInviteUrl(blendMemberId));

    const timer = window.setTimeout(() => setShowInvite(true), 150);
    return () => window.clearTimeout(timer);
  }, [blendMemberId]);

  function completeImport(result: ImportPlaylistResponse, platform: "spotify" | "youtube") {
    markBlendCreator(result.blendId, result.blendMemberId);
    setBlendMemberId(result.blendMemberId);

    if (platform === "spotify") {
      setSpotifyTrackCount(result.trackCount);
      setSpotifyImported(true);
    } else {
      setYoutubeTrackCount(result.trackCount);
      setYoutubeImported(true);
    }

    router.push(`/join/${result.blendMemberId}?role=creator`);
  }

  async function handleSpotifyImport() {
    setSpotifyError("");

    if (detectPlaylistPlatform(spotifyUrl) !== "spotify") {
      setSpotifyError("Enter a valid Spotify playlist URL.");
      return;
    }

    setSpotifyLoading(true);

    try {
      const response = await fetch("/api/blend/import-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistUrl: spotifyUrl,
          blendMemberId: blendMemberId ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      completeImport(data as ImportPlaylistResponse, "spotify");
    } catch (error) {
      setSpotifyError(
        error instanceof Error ? error.message : "Failed to import playlist",
      );
    } finally {
      setSpotifyLoading(false);
    }
  }

  async function handleYouTubeImport() {
    setYoutubeError("");

    if (detectPlaylistPlatform(youtubeUrl) !== "youtube") {
      setYoutubeError("Enter a valid YouTube Music playlist URL.");
      return;
    }

    setYoutubeLoading(true);

    try {
      const response = await fetch("/api/blend/import-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistUrl: youtubeUrl,
          blendMemberId: blendMemberId ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      completeImport(data as ImportPlaylistResponse, "youtube");
    } catch (error) {
      setYoutubeError(
        error instanceof Error ? error.message : "Failed to import playlist",
      );
    } finally {
      setYoutubeLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="w-full max-w-2xl overflow-hidden border-zinc-800 bg-black/40 text-white">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <PlatformSection
            icon={<SpotifyIcon className="h-4 w-4 text-emerald-400" />}
            title="Spotify"
            accent="emerald"
            connected={spotifyImported}
            connectedLabel={`${spotifyTrackCount} tracks imported`}
          >
            <Input
              type="url"
              placeholder="Spotify playlist URL"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              disabled={spotifyLoading || spotifyImported}
              className="border-emerald-500/20 focus-visible:ring-emerald-500/20"
            />
            <Button
              type="button"
              variant={spotifyImported ? "spotifyConnected" : "spotify"}
              className="w-full"
              disabled={spotifyLoading || !spotifyUrl.trim() || spotifyImported}
              onClick={handleSpotifyImport}
            >
              {spotifyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : spotifyImported ? (
                <>
                  <Check className="h-4 w-4" />
                  Playlist imported
                </>
              ) : (
                "Import playlist"
              )}
            </Button>
            {spotifyError && (
              <p className="text-xs text-red-400">{spotifyError}</p>
            )}
          </PlatformSection>

          <PlatformSection
            icon={<YouTubeIcon className="h-4 w-4 text-red-400" />}
            title="YouTube Music"
            accent="red"
            connected={youtubeImported}
            connectedLabel={`${youtubeTrackCount} tracks imported`}
          >
            <Input
              type="url"
              placeholder="YouTube Music playlist URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={youtubeLoading || youtubeImported}
              className="border-red-500/20 focus-visible:ring-red-500/20"
            />
            <Button
              type="button"
              variant={youtubeImported ? "youtubeConnected" : "youtube"}
              className="w-full"
              disabled={youtubeLoading || !youtubeUrl.trim() || youtubeImported}
              onClick={handleYouTubeImport}
            >
              {youtubeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : youtubeImported ? (
                <>
                  <Check className="h-4 w-4" />
                  Playlist imported
                </>
              ) : (
                "Import playlist"
              )}
            </Button>
            {youtubeError && (
              <p className="text-xs text-red-400">{youtubeError}</p>
            )}
          </PlatformSection>
        </div>

        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            showInvite && hasImportedSession
              ? "max-h-48 opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none",
          )}
        >
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-black">
                <Link2 className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Invite Link</p>
                <p className="text-xs text-zinc-500">
                  Share this link so a friend can join your blend.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteLink}
                aria-label="Invite link"
                className="font-mono text-xs text-zinc-300 sm:text-sm"
              />
              <Button
                type="button"
                variant="copy"
                size="icon"
                onClick={handleCopy}
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
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformSection({
  icon,
  title,
  accent,
  connected,
  connectedLabel,
  children,
}: {
  icon: ReactNode;
  title: string;
  accent: "emerald" | "red";
  connected: boolean;
  connectedLabel: string;
  children: ReactNode;
}) {
  const borderClass =
    accent === "emerald" ? "border-emerald-500/20" : "border-red-500/20";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-zinc-950/30 p-4",
        borderClass,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {connected && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Check className="h-3 w-3 text-emerald-400" />
            {connectedLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
