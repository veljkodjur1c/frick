import { Avatar, Card, Divider, EmptyState, Skeleton } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { daysLeftInWeek, isBossDefeated, summarizeDamage } from "@/lib/game/boss";
import { requireUser } from "@/lib/supabase/auth";
import { AnimatedBossBar, BossBarSkeleton } from "./AnimatedBossBar";
import { getCurrentBoss } from "./queries";

function daysLeftLabel(days: number) {
  if (days === 0) return "Poslednji dan";
  return days === 1 ? "Još 1 dan" : `Još ${days} dana`;
}

/** This week's boss, its HP and each player's damage. Reads the session, so it sits inside <Suspense>. */
export async function BossView() {
  const user = await requireUser();
  const data = await getCurrentBoss();

  if (!data) {
    return (
      <EmptyState
        title="Ove nedelje još nema bossa"
        description="Boss stiže kad počne nedelja. Do tada predložite taskove u champ selectu."
      />
    );
  }

  const { boss } = data;
  const { damage, pendingDamage, byPlayer } = summarizeDamage(data.completions);
  const defeated = isBossDefeated(boss.hp, damage);
  const players = data.players
    .map((player) => ({ ...player, damage: byPlayer[player.id] ?? 0 }))
    .sort((a, b) => b.damage - a.damage || a.displayName.localeCompare(b.displayName, "sr"));

  return (
    <div className="flex flex-col gap-6">
      <Card variant="framed">
        <div className="flex flex-col gap-3">
          {boss.imageUrl && (
            // Boss art can come from any host; next/image would need each one configured.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={boss.imageUrl} alt={boss.name} className="aspect-video w-full rounded-lg object-cover" />
          )}
          <AnimatedBossBar bossId={boss.id} name={boss.name} hp={boss.hp} damage={damage} />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-fg-muted">
              {defeated ? "Boss je pao! Limenke stižu na kraju nedelje." : daysLeftLabel(daysLeftInWeek())}
            </span>
            {pendingDamage > 0 && (
              <span className="shrink-0 text-pending tabular-nums">+{formatNumber(pendingDamage)} čeka glasove</span>
            )}
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Divider label="Šteta ove nedelje" />
        <Card padding="sm">
          <ul className="flex flex-col divide-y divide-line">
            {players.map((player) => (
              <li key={player.id} className="flex items-center gap-3 py-2">
                <Avatar name={player.displayName} src={player.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-fg">
                  {player.displayName}
                  {player.id === user.id && <span className="text-fg-muted"> · ti</span>}
                </span>
                <span className="font-semibold text-fg tabular-nums">{formatNumber(player.damage)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

export function BossViewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card variant="framed">
        <BossBarSkeleton />
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
