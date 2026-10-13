import { ProofFeedCard } from "@/features/proofs/ProofFeedCard";
import { AnnouncementCard } from "./AnnouncementCard";
import { FeedPostCard } from "./FeedPostCard";
import type { FeedItem } from "./queries";

/** One feed entry: a post, a task proof or an announcer event. Used by the server list and the "Učitaj još" list. */
export function FeedItemCard({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "post":
      return <FeedPostCard post={item} />;
    case "proof":
      return <ProofFeedCard proof={item} />;
    case "announcement":
      return <AnnouncementCard announcement={item} />;
  }
}
