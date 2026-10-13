import { PostCard } from "./PostCard";
import type { FeedPostData } from "./queries";

/** A feed post rendered as a PostCard. Used by the server list and the client "Učitaj još" list. */
export function FeedPostCard({ post }: { post: FeedPostData }) {
  return (
    <PostCard
      author={{ name: post.author.displayName, avatarUrl: post.author.avatarUrl }}
      createdAt={post.createdAt}
      imageUrl={post.imageUrl}
      caption={post.caption}
    />
  );
}
