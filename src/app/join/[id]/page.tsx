import { notFound } from "next/navigation";

import JoinPageShell from "@/components/join/JoinPageShell";
import { resolveBlendSession } from "@/lib/resolve-blend-invite";

type JoinPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { id } = await params;
  const resolved = await resolveBlendSession(id);

  if (!resolved) {
    notFound();
  }

  return (
    <JoinPageShell
      inviteId={id}
      session={resolved}
    />
  );
}
