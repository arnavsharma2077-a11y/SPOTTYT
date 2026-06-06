import ConnectCard from "@/components/landing/ConnectCard";
import OnboardingRippleCanvas from "@/components/landing/OnboardingRippleCanvas";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-white sm:px-6">
      <OnboardingRippleCanvas />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center justify-center text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Cross-Platform Music Blend
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
          Paste a public Spotify/Youtube Music playlist, and invite friends to
          discover the overlap in your libraries.
        </p>

        <p className="mb-6 mt-10 text-sm font-medium uppercase tracking-wider text-slate-500">
          Build your blend
        </p>

        <div className="mx-auto flex w-full items-center justify-center">
          <ConnectCard />
        </div>

        <p className="mt-8 max-w-md text-xs leading-relaxed text-zinc-500">
          Spotify imports scrape public playlist pages — no API key required.
          YouTube supports playlist URLs or direct Google sign-in.
        </p>
      </div>
    </main>
  );
}
