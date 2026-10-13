import Link from "next/link";
import { Avatar, Badge, buttonClasses, Card, Divider, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber } from "@/lib/format";
import { buildShelf, CAN_FLAVORS, countCollected, nextCanFlavor, type ShelfSlot } from "@/lib/game/cans";
import { requireUser } from "@/lib/supabase/auth";
import { MonsterCan } from "./MonsterCan";
import { getShelves, type EarnedCan, type ShelfPlayer } from "./queries";

const TOTAL = formatNumber(CAN_FLAVORS.length);

/** Reads the session, so it sits inside <Suspense>. */
export async function ShelfView() {
  const user = await requireUser();
  return <Shelves players={await getShelves()} viewerId={user.id} />;
}

/** The viewer's cans on a shelf, then everyone's progress. */
function Shelves({ players, viewerId }: { players: ShelfPlayer[]; viewerId: string }) {
  const myCans = players.find((player) => player.id === viewerId)?.cans ?? [];
  const next = nextCanFlavor(myCans.map((can) => can.flavor));
  const teamHasCans = players.some((player) => player.cans.length > 0);
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
          <ul aria-label="Tvoje limenke" className="grid grid-cols-3 gap-y-5">
            {buildShelf(myCans).map((slot) => (
              <CanSlot key={slot.flavor.id} slot={slot} isNext={slot.flavor.id === next.id} />
            ))}
          </ul>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Divider label="Tim" />
        {teamHasCans ? (
          <Card padding="sm">
            <ul className="flex flex-col divide-y divide-line">
              {ranked.map((player) => (
                <li key={player.id} className="flex items-center gap-3 py-2">
                  <Avatar name={player.displayName} src={player.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-fg">
                      {player.displayName}
                      {player.id === viewerId &&<span className="text-fg-muted"> · ti</span>}
                    </p>
                    <div aria-hidden className="mt-1 flex gap-1">
                      {buildShelf(player.cans).map((slot) => (
                        <MonsterCan key={slot.flavor.id} color={slot.flavor.color} locked={!slot.cans.length} className="h-5" />
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
            description="Oborite bossa zajedno do nedelje uveče i svako dobija prvu limenku."
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

/** One flavor on the shelf: the can standing on a gold shelf board, with its name below. */
function CanSlot({ slot, isNext }: { slot: ShelfSlot<EarnedCan>; isNext: boolean }) {
  const latest = slot.cans[0];

  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      <div className="relative flex justify-center">
        <MonsterCan color={slot.flavor.color} locked={!latest} className="h-20" />
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
      {latest ? (
        <p className="mt-0.5 w-full px-1 text-xs text-fg-muted">
          {latest.bossName && <span className="block truncate">{latest.bossName}</span>}
          <span className="tabular-nums">{formatDate(new Date(latest.earnedAt))}</span>
        </p>
      ) : (
        isNext && <p className="mt-0.5 text-xs text-gold-300">Sledeća</p>
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
