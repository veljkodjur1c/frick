import { ProofFeedCard } from "@/features/proofs/ProofFeedCard";
import { FeedPostCard } from "./FeedPostCard";
import type { FeedItem } from "./queries";

/** One feed entry: a post or a task proof. Used by the server list and the client "Učitaj još" list. */
export function FeedItemCard({ item }: { item: FeedItem }) {
  return item.kind === "post" ? <FeedPostCard post={item} /> : <ProofFeedCard proof={item} />;
}
