import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Flag, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, Panel } from "@/components/app/Page";
import AuthorLine from "@/components/community/AuthorLine";
import { useCommunityThread, useCreateReply, useDeletePost, useDeleteReply, useReportContent } from "@/hooks/use-community";
import { groupPath, replyProblem, REPLY_BODY_MAX } from "@shared/community/community";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition";

function ReportButton({ target }: { target: { postId: string } | { replyId: string } }) {
  const report = useReportContent();
  const [done, setDone] = useState(false);
  if (done) return <span className="text-xs text-muted-foreground">Reported</span>;
  return (
    <button
      type="button"
      onClick={() => {
        const reason = window.prompt("What's wrong with it? (spam, abuse, off topic…)");
        if (reason === null) return;
        report.mutate({ target, reason }, {
          onSuccess: () => setDone(true),
          onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <Flag className="w-3.5 h-3.5" /> Report
    </button>
  );
}

/** /owners/post/:id — one thread and its replies. */
export default function OwnersThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const thread = useCommunityThread(id);
  const reply = useCreateReply();
  const removePost = useDeletePost();
  const removeReply = useDeleteReply();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = replyProblem(body);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    try {
      await reply.mutateAsync({ postId: id!, body });
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post the reply.");
    }
  }

  function deletePost() {
    if (!window.confirm("Delete this thread and its replies?")) return;
    removePost.mutate(id!, {
      onSuccess: () => navigate(groupPath(post!.makeKey, post!.modelKey)),
      onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
    });
  }

  if (thread.isLoading) {
    return <PageContainer className="max-w-3xl"><p className="text-sm text-muted-foreground">Loading…</p></PageContainer>;
  }
  if (!thread.data) {
    return (
      <PageContainer className="max-w-3xl">
        <Panel className="text-sm text-muted-foreground">
          That thread isn't here any more.{" "}
          <Link to="/owners" className="font-semibold text-sky-700 hover:underline">Back to Owners</Link>
        </Panel>
      </PageContainer>
    );
  }

  const { post, replies, canReply } = thread.data;

  return (
    <PageContainer className="max-w-3xl">
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/owners" className="hover:text-foreground">Owners</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={groupPath(post.makeKey)} className="hover:text-foreground">{post.make}</Link>
        {post.model && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link to={groupPath(post.makeKey, post.modelKey)} className="hover:text-foreground">{post.model}</Link>
          </>
        )}
      </nav>

      <Panel>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-start gap-2">
          {post.pinned && <Pin className="w-4 h-4 text-sky-600 shrink-0 mt-1.5" />}
          <span>{post.title}</span>
        </h1>
        <AuthorLine author={post.author} boat={post.authorBoat} when={post.createdAt} size="md" className="mt-3" />
        <p className="mt-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.body}</p>
        {post.photoUrl && (
          <a href={post.photoUrl} target="_blank" rel="noreferrer" className="block mt-4">
            <img src={post.photoUrl} alt="" className="max-h-96 rounded-lg border border-border object-contain bg-slate-50" />
          </a>
        )}
        <div className="mt-4 flex items-center gap-4">
          {post.mine ? (
            <button type="button" onClick={deletePost} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
              <Trash2 className="w-3.5 h-3.5" /> Delete thread
            </button>
          ) : (
            <ReportButton target={{ postId: post.id }} />
          )}
        </div>
      </Panel>

      <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h2>
      <Panel padded={false}>
        <ul className="divide-y divide-border">
          {replies.map((r) => (
            <li key={r.id} className="px-5 py-4">
              <AuthorLine author={r.author} boat={r.authorBoat} when={r.createdAt} />
              <p className="mt-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{r.body}</p>
              <div className="mt-2">
                {r.mine ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Delete your reply?")) return;
                      removeReply.mutate(r.id, { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) });
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                ) : (
                  <ReportButton target={{ replyId: r.id }} />
                )}
              </div>
            </li>
          ))}
          {replies.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground text-center">No replies yet.</li>}
        </ul>
        {canReply && (
          <form onSubmit={submit} className="border-t border-border px-5 py-4 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, REPLY_BODY_MAX))}
              placeholder="Add what you know. Hours, part numbers and what it cost help the next owner."
              rows={3}
              className={inputCls}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={reply.isPending} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                {reply.isPending ? "Posting…" : "Reply"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </PageContainer>
  );
}
