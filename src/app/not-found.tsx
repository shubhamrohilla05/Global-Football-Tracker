import Link from "next/link";
import { Home, Trophy, Goal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[64vh] max-w-lg flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div className="pointer-events-none absolute top-10 h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.12] blur-[110px]" />
      <div className="relative">
        <span className="brand-mark mx-auto grid h-16 w-16 place-items-center rounded-2xl">
          <Goal className="h-8 w-8 text-[var(--on-accent)]" strokeWidth={2.4} />
        </span>
        <h1 className="mt-6 font-display text-6xl font-extrabold tracking-tight text-gradient">
          404
        </h1>
        <p className="mt-3 font-display text-lg font-semibold">Off the pitch</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          The page you&apos;re looking for isn&apos;t here — it may have been
          moved, or this fixture, team, or league isn&apos;t in the synced data.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            <Home className="h-4 w-4" />
            Back to home
          </Link>
          <Link href="/fixtures" className="btn-ghost">
            <Trophy className="h-4 w-4" />
            Browse fixtures
          </Link>
        </div>
      </div>
    </div>
  );
}
