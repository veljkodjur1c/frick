import { Card, Divider, EmptyState, Skeleton } from "@/components/ui";
import { formatTaskCount } from "@/lib/format";
import { TITLE_MIN_TASKS } from "@/lib/game/config";
import { CATEGORY_INFO } from "@/lib/game/titles";
import { CategoryIcon } from "./CategoryIcon";
import { getPlayerTitles, type PlayerTitle } from "./queries";

/** "Titule" section of a profile: one banner per title the player holds. */
export async function TitleBanners({ userId }: { userId: string }) {
  return <TitleBannerList titles={await getPlayerTitles(userId)} />;
}

/** The section itself, for titles already loaded (also used by the /design preview). */
export function TitleBannerList({ titles }: { titles: PlayerTitle[] }) {
  return (
    <section className="flex flex-col gap-3">
      <Divider label="Titule" />
      {titles.length === 0 ? (
        <EmptyState
          title="Još nemaš titulu"
          description={`Uradi bar ${formatTaskCount(TITLE_MIN_TASKS)} iz iste kategorije i budi prvi u ekipi.`}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {titles.map((title) => (
            <li key={title.category}>
              <TitleBanner title={title} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TitleBanner({ title }: { title: PlayerTitle }) {
  const info = CATEGORY_INFO[title.category];
  return (
    <Card variant="framed" padding="sm">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-700/40 text-gold-200">
          <CategoryIcon category={title.category} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-gold-200">{info.title}</p>
          <p className="text-sm text-fg-muted tabular-nums">
            {formatTaskCount(title.count)} · {info.description}
          </p>
          {title.sharedWith.length > 0 && (
            <p className="text-sm text-fg-muted">Deliš titulu sa: {title.sharedWith.join(", ")}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TitleBannersSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <Divider label="Titule" />
      <Skeleton className="h-[4.5rem] w-full" />
    </section>
  );
}
