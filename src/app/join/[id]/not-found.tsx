import Link from "next/link";

export default function JoinNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Invite not found</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-500">
        This blend invite link may have expired or is invalid.
      </p>
      <Link
        href="/"
        className="mt-8 text-sm text-zinc-400 underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
