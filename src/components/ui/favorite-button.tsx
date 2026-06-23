"use client";

import { Star } from "lucide-react";
import { usePreferences } from "./use-preferences";

/** Toggle-button to follow / unfollow a team. */
export function FavoriteButton({ teamId, teamName }: { teamId: number; teamName: string }) {
  const { isFavorite, toggleFavorite, hydrated } = usePreferences();
  const active = hydrated && isFavorite(teamId);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(teamId)}
      aria-pressed={active}
      aria-label={active ? `Unfollow ${teamName}` : `Follow ${teamName}`}
      className={
        "btn-ghost !gap-2 transition-colors " +
        (active
          ? "!border-[color-mix(in_oklab,var(--gold)_45%,transparent)] !text-[var(--gold)]"
          : "")
      }
    >
      <Star className={"h-4 w-4 " + (active ? "fill-current" : "")} />
      {active ? "Following" : "Follow"}
    </button>
  );
}
