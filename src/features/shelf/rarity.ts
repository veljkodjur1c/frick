import type { CanRarity } from "@/lib/game/cans";

export const RARITY_LABEL: Record<CanRarity, string> = {
  common: "Česta",
  rare: "Retka",
  legendary: "Legendarna",
};

/** Text color per rarity (labels only). */
export const RARITY_TEXT: Record<CanRarity, string> = {
  common: "text-fg-muted",
  rare: "text-hextech-300",
  legendary: "text-gold-300",
};
