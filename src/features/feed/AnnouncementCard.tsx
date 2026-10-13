import { Fragment, type ReactNode } from "react";
import { Avatar, Card } from "@/components/ui";
import { formatNumber, formatTimeAgo } from "@/lib/format";
import type { AnnouncementPlayer, FeedAnnouncementData } from "./announcements";

type Event = FeedAnnouncementData["event"];

// The announcer's words stay in English, like in the game.
const TITLES: Record<Event["kind"], string> = {
  "first-blood": "First Blood",
  "last-hit": "Last hit",
  pentakill: "Pentakill",
  shutdown: "Shutdown",
};

/** An announcer event in the feed: who did it, a gold title like in the game, and what happened. */
export function AnnouncementCard({ announcement }: { announcement: FeedAnnouncementData }) {
  const { event, createdAt } = announcement;

  return (
    <Card as="article" padding="sm" className="flex items-center gap-3">
      {event.kind !== "pentakill" && (
        <Avatar name={event.player.displayName} src={event.player.avatarUrl} size="lg" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-display text-lg font-bold text-gold-200">{TITLES[event.kind]}</p>
        <p className="text-fg">{message(event)}</p>
        {event.kind === "pentakill" && (
          <div className="flex flex-wrap gap-1.5 py-1">
            {event.players.map((player) => (
              <Avatar key={player.id} name={player.displayName} src={player.avatarUrl} size="sm" />
            ))}
          </div>
        )}
        {/* "pre 5 minuta" can tick over between the server render and hydration; that's fine. */}
        <time dateTime={createdAt} className="text-sm text-fg-muted" suppressHydrationWarning>
          {formatTimeAgo(new Date(createdAt))}
        </time>
      </div>
    </Card>
  );
}

function message(event: Event): ReactNode {
  switch (event.kind) {
    case "first-blood":
      return (
        <>
          <Names players={[event.player]} /> otvara nedelju: „{event.taskTitle}“
        </>
      );
    case "last-hit":
      return (
        <>
          <Names players={[event.player]} /> zadaje poslednji udarac. {event.bossName} je pao!
        </>
      );
    case "pentakill":
      return `Svih ${formatNumber(event.players.length)} igrača odradilo je bar po jedan task istog dana.`;
    case "shutdown":
      return (
        <>
          <Names players={[event.player]} /> prestiže <Names players={event.overtaken} />. Prošle nedelje Feeder, ove
          nedelje ispred MVP-a.
        </>
      );
  }
}

/** "Ana", "Ana i Bob", "Ana, Bob i Cid", each name in bold. */
function Names({ players }: { players: readonly AnnouncementPlayer[] }) {
  return players.map((player, i) => (
    <Fragment key={player.id}>
      {i > 0 && (i === players.length - 1 ? " i " : ", ")}
      <span className="font-semibold">{player.displayName}</span>
    </Fragment>
  ));
}
