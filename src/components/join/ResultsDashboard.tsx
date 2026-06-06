"use client";

import { toPng } from "html-to-image";
import { ChevronDown, Music2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import MatchScoreCircle from "@/components/join/MatchScoreCircle";
import SonicDnaMap from "@/components/join/SonicDnaMap";
import { SpotifyIcon, YouTubeIcon } from "@/components/icons/PlatformIcons";
import { Button } from "@/components/ui/button";
import { getDynamicBlendTag } from "@/lib/blend-tags";
import {
  pickNoArtistsPhrase,
  pickNoTracksPhrase,
} from "@/lib/blend-empty-phrases";
import {
  pickRandomBlendTheme,
  type BlendTheme,
} from "@/lib/blend-theme";
import { getBlendShareCardBackgroundClass } from "@/lib/blend-page-background";
import { cn } from "@/lib/utils";
import type { MatchBlendResponse } from "@/types/blend";

type ResultsDashboardProps = {
  result: MatchBlendResponse;
  blendName?: string;
};

export default function ResultsDashboard({
  result,
  blendName,
}: ResultsDashboardProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [cardExporting, setCardExporting] = useState(false);
  const [theme] = useState<BlendTheme>(() => pickRandomBlendTheme());
  const tag = useMemo(
    () => getDynamicBlendTag(result.overlapScore),
    [result.overlapScore],
  );
  const noArtistsPhrase = useMemo(
    () => pickNoArtistsPhrase(result.blendId),
    [result.blendId],
  );
  const noTracksPhrase = useMemo(
    () => pickNoTracksPhrase(result.blendId),
    [result.blendId],
  );

  function handleShareBlend() {
    if (!shareCardRef.current || cardExporting) {
      return;
    }

    const cardElement = shareCardRef.current;
    setCardExporting(true);

    const pngOptions = { pixelRatio: 3, cacheBust: true };

    if (
      typeof navigator.clipboard?.write !== "function" ||
      typeof ClipboardItem === "undefined"
    ) {
      toPng(cardElement, pngOptions)
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = "my-music-blend.png";
          link.href = dataUrl;
          link.click();
        })
        .finally(() => {
          setCardExporting(false);
        });
      return;
    }

    const blobPromise = toPng(cardElement, pngOptions).then((dataUrl) =>
      fetch(dataUrl).then((res) => res.blob()),
    );

    navigator.clipboard
      .write([
        new ClipboardItem({
          "image/png": blobPromise,
        }),
      ])
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch((err) => {
        console.warn(
          "Clipboard blocked image write, running fallback download:",
          err,
        );
        toPng(cardElement, pngOptions).then((dataUrl) => {
          const link = document.createElement("a");
          link.download = "my-music-blend.png";
          link.href = dataUrl;
          link.click();
        });
      })
      .finally(() => {
        setCardExporting(false);
      });
  }

  const [countA, countB] = result.memberTrackCounts;
  const isChaotic = result.overlapScore < 60;
  const artistsDescription =
    result.sharedArtists.length > 0
      ? `${result.sharedArtists.length} shared artists`
      : noArtistsPhrase;
  const tracksDescription =
    result.matchingTracks.length > 0
      ? `${result.matchingTracks.length} matching tracks`
      : noTracksPhrase;

  return (
    <>
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 transform"
        >
          <div className="animate-fade-in-up rounded-full border border-white/10 bg-slate-900/90 px-6 py-3 text-sm font-medium tracking-wide text-white shadow-xl backdrop-blur-md">
            Copied to clipboard!
          </div>
        </div>
      )}

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-md animate-in fade-in duration-700">
      <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/40">
            Blend Wrapped
          </p>
          {blendName && (
            <p className="mt-1 text-sm text-white/50">{blendName}</p>
          )}
        </div>

        <div
          ref={shareCardRef}
          className={cn(
            "relative overflow-hidden rounded-3xl border border-white/10 px-6 py-10 sm:px-10 sm:py-12",
            getBlendShareCardBackgroundClass(result.overlapScore),
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0",
              isChaotic
                ? "bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(244,63,94,0.22),transparent_55%),radial-gradient(ellipse_60%_45%_at_85%_90%,rgba(24,24,27,0.3),transparent_50%)]"
                : "bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(ellipse_60%_45%_at_85%_90%,rgba(192,38,211,0.18),transparent_50%)]",
            )}
          />

          <div className="relative flex flex-col items-center text-center">
            <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {tag.headline}
            </h1>
            <p className="mt-4 max-w-lg text-sm text-white/55 sm:text-base">
              {tag.subtitle}
            </p>

            <div className="mt-10">
              <MatchScoreCircle
                score={result.overlapScore}
                colorA={theme.colorA}
                colorMid={theme.colorMid}
                colorB={theme.colorB}
              />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.28em] text-white/40">
              {result.matchCount} overlap · {countA} vs {countB} tracks
            </p>

            <div className="mt-8 flex items-center justify-center gap-5 text-[10px] uppercase tracking-[0.28em] text-white/35">
              <span
                className="inline-flex items-center gap-2"
                style={{ color: theme.colorA }}
              >
                <SpotifyIcon className="h-3.5 w-3.5" />
                {countA}
              </span>
              <span
                className="h-px w-8"
                style={{
                  background: `linear-gradient(to right, ${theme.colorA}, ${theme.colorB})`,
                }}
              />
              <span
                className="inline-flex items-center gap-2"
                style={{ color: theme.colorB }}
              >
                <YouTubeIcon className="h-3.5 w-3.5" />
                {countB}
              </span>
            </div>

            <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.35em] text-white/30">
              Cross-Platform Music Blend
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-3">
          <DisclosurePanel
            title="Genre Overlap"
            description="Blended taste dimensions from both libraries"
            icon={
              <Sparkles className="h-4 w-4" style={{ color: theme.colorMid }} />
            }
            count={result.sonicDna.length}
            theme={theme}
          >
            <SonicDnaMap dimensions={result.sonicDna} />
          </DisclosurePanel>

          <DisclosurePanel
            title="Shared Artists"
            description={artistsDescription}
            icon={<Users className="h-4 w-4" style={{ color: theme.colorB }} />}
            count={result.sharedArtists.length}
            theme={theme}
          >
            {result.sharedArtists.length === 0 ? (
              <EmptyState message={noArtistsPhrase} />
            ) : (
              <ul className="space-y-2">
                {result.sharedArtists.map((artist) => (
                  <li
                    key={artist}
                    className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-medium text-white/90"
                  >
                    {artist}
                  </li>
                ))}
              </ul>
            )}
          </DisclosurePanel>

          <DisclosurePanel
            title="Matching Tracks"
            description={tracksDescription}
            icon={<Music2 className="h-4 w-4" style={{ color: theme.colorA }} />}
            count={result.matchingTracks.length}
            theme={theme}
          >
            {result.matchingTracks.length === 0 ? (
              <EmptyState message={noTracksPhrase} />
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {result.matchingTracks.map((track, index) => (
                  <li
                    key={`${track.name}-${track.artist}-${index}`}
                    className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"
                  >
                    <p className="truncate text-sm font-medium text-white">
                      {track.name}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {track.artist}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DisclosurePanel>
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button
            type="button"
            disabled={cardExporting}
            className="h-12 border border-white/20 bg-white/10 px-6 text-white backdrop-blur-md hover:bg-white/15 disabled:opacity-60"
            onClick={handleShareBlend}
          >
            {cardExporting ? "Preparing blend…" : "Share Your Blend"}
          </Button>
          <Button
            asChild
            className="h-12 border-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110"
          >
            <Link href="/">Create Your Own Blend</Link>
          </Button>
        </div>
      </div>
    </section>
    </>
  );
}

function DisclosurePanel({
  title,
  description,
  icon,
  count,
  theme,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  count: number;
  theme: BlendTheme;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.08]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70"
                style={{ background: `${theme.colorMid}33` }}
              >
                {count}
              </span>
            </div>
            <p className="truncate text-xs text-white/45">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-white/50 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 bg-black/20 px-5 py-4 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm leading-relaxed text-white/50 backdrop-blur-sm">
      {message}
    </p>
  );
}
