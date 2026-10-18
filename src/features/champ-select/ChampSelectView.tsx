import Link from "next/link";
import { Card, Divider, EmptyState, Skeleton, buttonClasses } from "@/components/ui";
import { syncWeekPhase } from "@/features/week/weekPhase";
import { formatNumber } from "@/lib/format";
import { damageRange, fillTasks, isProposalApproved, maxDamage } from "@/lib/game/champSelect";
import { CHAMP_SELECT_OPENS_HOUR, PROPOSAL_APPROVALS_NEEDED } from "@/lib/game/config";
import { bossForWeek } from "@/lib/game/settlement";
import { DamageMeter } from "./DamageMeter";
import { NewProposalSheet } from "./NewProposalSheet";
import { ProposalCard } from "./ProposalCard";
import { getChampSelect } from "./queries";

/** "2026-10-19" -> "19. 10." */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)}. ${Number(month)}.`;
}

/** Next week's proposals and voting. Reads the session, so it sits inside <Suspense>. */
export async function ChampSelectView() {
  await syncWeekPhase();
  const data = await getChampSelect();

  if (data.state === "closed") {
    return (
      <EmptyState
        title="Champ select je zatvoren"
        description={`Otvara se u nedelju u ${CHAMP_SELECT_OPENS_HOUR}h. Tada predlažete i birate taskove za sledeću nedelju.`}
        action={
          <Link href="/tasks" className={buttonClasses({ variant: "secondary" })}>
            Taskovi ove nedelje
          </Link>
        }
      />
    );
  }

  // The same numbers the week is filled up with at midnight (fillTasksFor() in src/features/week/weekPhase.ts).
  const passing = data.proposals.filter((proposal) => isProposalApproved(proposal.votes.za));
  const boss = bossForWeek(data.weekStartsOn);
  const range = damageRange(boss.hp);
  const fill = fillTasks(data.weekStartsOn, passing, range);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <p className="text-fg">
          Taskovi za nedelju od {shortDate(data.weekStartsOn)}
          <span className="block text-sm text-fg-muted">
            Predlog sa bar {formatNumber(PROPOSAL_APPROVALS_NEEDED)} Za glasa postaje task. Glasanje traje do ponoći.
          </span>
        </p>
        <NewProposalSheet players={data.players} />
      </Card>

      <DamageMeter
        damage={maxDamage(passing)}
        range={range}
        boss={{ name: boss.name, hp: boss.hp }}
        teamCount={passing.filter((proposal) => proposal.scope === "team").length}
        soloCount={passing.filter((proposal) => proposal.scope === "solo").length}
        fill={fill.map((task) => ({ title: task.title, points: task.points }))}
      />

      <section className="flex flex-col gap-3">
        <Divider label="Predlozi" />
        {data.proposals.length === 0 ? (
          <EmptyState title="Još nema predloga" description="Budi prvi: predloži task za sledeću nedelju." />
        ) : (
          data.proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)
        )}
      </section>
    </div>
  );
}

export function ChampSelectSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
      </Card>
      {[0, 1].map((key) => (
        <Card key={key} className="flex flex-col gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-11 w-full" />
        </Card>
      ))}
    </div>
  );
}
