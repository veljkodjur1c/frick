import Link from "next/link";
import { Avatar, Badge, buttonClasses, Card, Divider, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber } from "@/lib/format";
import {
  buildShelf,
  CAN_FLAVORS,
  collectors,
  countCollected,
  missingFlavors,
  spareCans,
  type CanRarity,
  type ShelfSlot,
} from "@/lib/game/cans";
import { CAN_RARITY_CHANCE } from "@/lib/game/config";
import { requireUser } from "@/lib/supabase/auth";
import { CraftSheet } from "./CraftSheet";
import { MonsterCan } from "./MonsterCan";
import { getShelves, type EarnedCan, type ShelfPlayer } from "./queries";
import { RARITY_LABEL, RARITY_TEXT } from "./rarity";

const TOTAL = formatNumber(CAN_FLAVORS.length);

const ODDS = (Object.keys(CAN_RARITY_CHANCE) as CanRarity[])
  .map((rarity) => `${RARITY_LABEL[rarity].toLowerCase()} ${formatNumber(CAN_RARITY_CHANCE[rarity] * 100)}%`)
  .join(" · ");

/** Reads the session, so it sits inside <Suspense>. */
export async function ShelfView() {
  const user = await requireUser();
  return <Shelves players={await getShelves()} viewerId={user.id} />;
}

/** The viewer's cans on a shelf, then everyone's progress. */
function Shelves({ players, viewerId }: { players: ShelfPlayer[]; viewerId: string }) {
  const myCans = players.find((player) => player.id === viewerId)?.cans ?? [];
  const complete = missingFlavors(myCans.map((can) => can.flavor)).length === 0;
  const { first, completed } = collectors(players);
  const teamHasCans = players.some((player) => player.history.length > 0);
  const ranked = players
    .map((player) => ({ ...player, collected: countCollected(player.cans) }))
    .sort(
      (a, b) =>
        b.collected - a.collected ||
        b.cans.length - a.cans.length ||
        a.displayName.localeCompare(b.displayName, "sr"),
    );

  return (
    <div className="flex flex-col gap-6">
      <Card variant="framed">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-gold-200">Tvoja kolekcija</h2>
            <Badge tone="gold">
              {formatNumber(countCollected(myCans))} od {TOTAL}
            </Badge>
          </div>
          {complete && (
            <p className="text-sm text-gold-300">
              Skupio si sve ukuse!{first.has(viewerId) && " Ti si Kolekcionar."}
            </p>
          )}
          <ul aria-label="Tvoje limenke" className="grid grid-cols-3 gap-y-5">
            {buildShelf(myCans).map((slot) => (
              <CanSlot key={slot.flavor.id} slot={slot} />
            ))}
          </ul>
          <p className="text-xs text-fg-muted">Šanse po limenci: {ODDS}</p>
          {!complete && <CraftSheet spareCount={spareCans(myCans).length} />}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Divider label="Tim" />
        {teamHasCans ? (
          <Card padding="sm">
            <ul className="flex flex-col divide-y divide-line">
              {ranked.map((player) => (
                <li key={player.id} className="flex items-center gap-3 py-2">
                  <Avatar
                    name={player.displayName}
                    src={player.avatarUrl}
                    size="sm"
                    highlight={completed.has(player.id) ? "collector" : "none"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-fg">
                      <span className="truncate">
                        {player.displayName}
                        {player.id === viewerId && <span className="text-fg-muted"> · ti</span>}
                      </span>
                      {first.has(player.id) && <Badge tone="hextech">Kolekcionar</Badge>}
                    </p>
                    <div aria-hidden className="mt-1 flex gap-1">
                      {buildShelf(player.cans).map((slot) => (
                        <MonsterCan key={slot.flavor.id} flavor={slot.flavor.id} locked={!slot.cans.length} className="h-6" />
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-fg tabular-nums">
                    {formatNumber(player.collected)} od {TOTAL}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            title="Polica je još prazna"
            description="Oborite bossa zajedno do nedelje uveče i svako dobija nasumičnu limenku, a MVP još jednu."
            action={
              <Link href="/boss" className={buttonClasses({ variant: "secondary" })}>
                Pogledaj bossa
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

/** Where a can came from, under its name. */
function origin(can: EarnedCan): string | null {
  if (can.source === "craft") return "Spajanje";
  if (can.source === "mvp") return can.bossName ? `MVP · ${can.bossName}` : "MVP";
  return can.bossName;
}

/** One flavor on the shelf: the can standing on a gold shelf board, with its name and rarity below. */
function CanSlot({ slot }: { slot: ShelfSlot<EarnedCan> }) {
  const latest = slot.cans[0];
  const from = latest && origin(latest);

  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      <div className="relative flex justify-center">
        <MonsterCan flavor={slot.flavor.id} locked={!latest} className="h-24" />
        {slot.cans.length > 1 && (
          <Badge tone="gold" className="absolute -top-1 left-full -ml-3">
            ×{formatNumber(slot.cans.length)}
          </Badge>
        )}
      </div>
      <span aria-hidden className="h-1 w-full bg-linear-to-b from-gold-300 to-gold-700" />
      <p className={cn("mt-2 px-1 text-sm leading-tight", latest ? "font-semibold text-fg" : "text-fg-muted")}>
        {slot.flavor.name}
        {!latest && <span className="sr-only">, još nije osvojena</span>}
      </p>
      <p className={cn("text-xs", RARITY_TEXT[slot.flavor.rarity])}>{RARITY_LABEL[slot.flavor.rarity]}</p>
      {latest && (
        <p className="mt-0.5 w-full px-1 text-xs text-fg-muted">
          {from && <span className="block truncate">{from}</span>}
          <span className="tabular-nums">{formatDate(new Date(latest.earnedAt))}</span>
        </p>
      )}
    </li>
  );
}

export function ShelfViewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card variant="framed">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-3 gap-y-5">
            {CAN_FLAVORS.map((flavor) => (
              <div key={flavor.id} className="flex flex-col items-center gap-2">
                <Skeleton className="h-20 w-9" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card padding="sm" className="flex flex-col gap-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex items-center gap-3">
            <Skeleton rounded="full" className="size-8" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </Card>
    </div>
  );
}
