import "server-only";
import { sendNotification, WebPushError, type VapidKeys } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { newCommentMessage, newPostMessage, newProofMessage, type PushMessage } from "./messages";

// Sending web push notifications. Called from Server Actions inside after(), once the post, proof or comment is
// saved, so the player doesn't wait for the push services. Everything here is best effort: errors are logged,
// never thrown. Reads the other players' subscriptions and names with the service role (RLS lets a player read
// only their own subscriptions).

type Recipients = { only: string } | { allExcept: string };

type SubscriptionRow = { endpoint: string; p256dh: string; auth: string };

/** How long a push service keeps trying to deliver to a phone that is off (seconds). */
const TTL = 24 * 60 * 60;

function vapidDetails(): (VapidKeys & { subject: string }) | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

/** Tells the other players about a new feed post. */
export async function notifyNewPost(authorId: string, postId: string, caption: string | null): Promise<void> {
  await safely("notifyNewPost", async () => {
    const authorName = await displayNameOf(authorId);
    await sendPush({ allExcept: authorId }, newPostMessage({ postId, authorName, caption }));
  });
}

/** Asks the other players to vote on a new proof. */
export async function notifyNewProof(authorId: string, completionId: string, taskTitle: string): Promise<void> {
  await safely("notifyNewProof", async () => {
    const authorName = await displayNameOf(authorId);
    await sendPush({ allExcept: authorId }, newProofMessage({ completionId, authorName, taskTitle }));
  });
}

/** Tells a post's author about a comment, unless they wrote it themselves. */
export async function notifyNewComment(commenterId: string, postId: string, comment: string): Promise<void> {
  await safely("notifyNewComment", async () => {
    const admin = createAdminClient();
    const { data: post, error } = await admin.from("posts").select("user_id").eq("id", postId).maybeSingle<{
      user_id: string;
    }>();
    if (error) throw error;
    if (!post || post.user_id === commenterId) return;
    const authorName = await displayNameOf(commenterId);
    await sendPush({ only: post.user_id }, newCommentMessage({ postId, authorName, comment }));
  });
}

/** Sends one message to every subscribed phone of the recipients and forgets phones that unsubscribed. */
async function sendPush(to: Recipients, message: PushMessage): Promise<void> {
  const vapid = vapidDetails();
  if (!vapid) return;

  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  query = "only" in to ? query.eq("user_id", to.only) : query.neq("user_id", to.allExcept);
  const { data, error } = await query.overrideTypes<SubscriptionRow[], { merge: false }>();
  if (error) throw error;

  const payload = JSON.stringify(message);
  const results = await Promise.allSettled(
    data.map((row) =>
      sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, {
        vapidDetails: vapid,
        TTL,
      }),
    ),
  );

  const gone: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") return;
    // 404/410: the phone turned notifications off or the subscription expired.
    if (result.reason instanceof WebPushError && (result.reason.statusCode === 404 || result.reason.statusCode === 410)) {
      gone.push(data[i].endpoint);
    } else {
      console.error("sendPush: sending failed", result.reason);
    }
  });
  if (gone.length > 0) {
    const { error: deleteError } = await admin.from("push_subscriptions").delete().in("endpoint", gone);
    if (deleteError) console.error("sendPush: deleting gone subscriptions failed", deleteError);
  }
}

async function displayNameOf(userId: string): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle<{ display_name: string }>();
  if (error) throw error;
  return data?.display_name ?? "FRICK";
}

async function safely(name: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.error(`${name} failed`, error);
  }
}
