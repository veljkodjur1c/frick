"use client";

import { useState, useTransition } from "react";
import { Avatar, Button, EmptyState, Sheet, Spinner, Textarea } from "@/components/ui";
import { formatNumber, formatTimeAgo } from "@/lib/format";
import { addComment, deleteComment, loadComments } from "./commentActions";
import { COMMENT_MAX_LENGTH, commentBodyError, type CommentData } from "./comments";

type PostCommentsSheetProps = {
  postId: string;
  /** Shown on the button; the card owns it so it stays right after the sheet closes. */
  count: number;
  onCountChange: (count: number) => void;
};

/** "Komentari (n)" button under a post and the sheet with the comments and a field to write one. */
export function PostCommentsSheet({ postId, count, onCountChange }: PostCommentsSheetProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentData[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function load() {
    setLoadError(null);
    startLoading(async () => {
      const result = await loadComments(postId);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setComments(result.comments);
      onCountChange(result.comments.length);
    });
  }

  function openSheet() {
    setOpen(true);
    // Reload every time, so comments written since the feed loaded show up.
    load();
  }

  function send() {
    const body = draft.trim();
    const invalid = commentBodyError(body);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    startSaving(async () => {
      const result = await addComment(postId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setComments((current) => [...(current ?? []), result.comment]);
      onCountChange(count + 1);
      setDraft("");
    });
  }

  function remove(commentId: string) {
    setError(null);
    setDeletingId(commentId);
    startSaving(async () => {
      const message = await deleteComment(commentId);
      setDeletingId(null);
      if (message) {
        setError(message);
        return;
      }
      setComments((current) => current?.filter((comment) => comment.id !== commentId) ?? null);
      onCountChange(Math.max(0, count - 1));
    });
  }

  return (
    <>
      <Button variant="ghost" fullWidth onClick={openSheet}>
        Komentari <span className="tabular-nums">({formatNumber(count)})</span>
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Komentari"
        footer={
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label="Komentar"
              placeholder="Napiši komentar…"
              rows={2}
              value={draft}
              maxLength={COMMENT_MAX_LENGTH}
              disabled={saving}
              error={error}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              size="lg"
              fullWidth
              loading={saving && deletingId === null}
              disabled={draft.trim() === "" || saving}
              onClick={send}
            >
              Pošalji komentar
            </Button>
          </div>
        }
      >
        {comments === null ? (
          loadError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p role="alert" className="text-sm text-danger">
                {loadError}
              </p>
              <Button variant="secondary" onClick={load}>
                Pokušaj ponovo
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-8 text-fg-muted">
              <Spinner label="Učitavanje komentara" />
            </div>
          )
        ) : comments.length === 0 ? (
          <EmptyState title="Još nema komentara" description="Napiši prvi komentar ispod." />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3 py-3">
                <Avatar name={comment.author.displayName} src={comment.author.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-fg">{comment.author.displayName}</span>
                    <time dateTime={comment.createdAt} className="text-sm text-fg-muted">
                      {formatTimeAgo(new Date(comment.createdAt))}
                    </time>
                  </p>
                  <p className="break-words whitespace-pre-line text-fg">{comment.body}</p>
                </div>
                {comment.isOwn && (
                  <Button
                    variant="ghost"
                    className="-mr-2 shrink-0"
                    loading={deletingId === comment.id}
                    disabled={saving}
                    onClick={() => remove(comment.id)}
                  >
                    Obriši
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
