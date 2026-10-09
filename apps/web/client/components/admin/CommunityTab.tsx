import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EyeOff, Flag, MessageSquare, Pin } from "lucide-react";
import { PageHeader, Panel, StatGrid, StatTile } from "@/components/app/Page";
import { useAdminCommunity, useAdminCommunityAction } from "@/hooks/use-admin";
import { postPath } from "@shared/community/community";
import type { ModerationAction, ModerationKind } from "@shared/community/moderation";
import { cn } from "@/lib/utils";

const btn = "px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-50";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Admin › Community: what's been flagged, and the latest threads with hide / pin / delete. */
export default function CommunityTab() {
  const q = useAdminCommunity();
  const act = useAdminCommunityAction();
  const data = q.data;

  function run(kind: ModerationKind, id: string, action: ModerationAction) {
    let reason: string | undefined;
    if (action === "hide") {
      const r = window.prompt("Why? (shown in the audit log)", "Off topic");
      if (r === null) return;
      reason = r;
    }
    if (action === "delete" && !window.confirm("Delete it for good? Replies and reports on it go too.")) return;
    act.mutate({ kind, id, action, reason }, { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) });
  }

  return (
    <>
      <PageHeader title="Community" description="Owners' threads. Hide what shouldn't be there, pin what every owner of that boat should read." />
      <StatGrid className="mb-6">
        <StatTile label="Threads" value={data?.totals.posts ?? "—"} icon={<MessageSquare />} />
        <StatTile label="Replies" value={data?.totals.replies ?? "—"} />
        <StatTile label="Open reports" value={data?.totals.openReports ?? "—"} tone={data?.totals.openReports ? "warn" : "default"} icon={<Flag />} />
        <StatTile label="Hidden" value={data?.totals.hidden ?? "—"} icon={<EyeOff />} />
      </StatGrid>

      <Panel padded={false} className="mb-6">
        <div className="px-5 pt-4 pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open reports</p></div>
        <ul className="divide-y divide-border">
          {(data?.reports ?? []).map((r) => (
            <li key={r.id} className="px-5 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {when(r.createdAt)} · <span className="font-medium text-foreground">{r.reporter}</span> flagged a {r.kind}
                    {r.author ? <> by <span className="font-medium text-foreground">{r.author}</span></> : null}
                    {r.hidden && <span className="ml-2 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">hidden</span>}
                  </p>
                  <p className="mt-0.5 font-medium">“{r.reason}”</p>
                  <p className="mt-0.5 text-muted-foreground">{r.excerpt ?? "(already deleted)"}</p>
                  {r.postId && <Link to={postPath(r.postId)} target="_blank" className="mt-1 inline-block text-xs font-semibold text-sky-700 hover:underline">Open thread</Link>}
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {r.excerpt !== null && !r.hidden && <button className={btn} disabled={act.isPending} onClick={() => run(r.kind, r.targetId, "hide")}>Hide</button>}
                  {r.excerpt !== null && <button className={cn(btn, "text-red-600")} disabled={act.isPending} onClick={() => run(r.kind, r.targetId, "delete")}>Delete</button>}
                  <button className={btn} disabled={act.isPending} onClick={() => run("report", r.id, "resolve")}>Dismiss</button>
                </div>
              </div>
            </li>
          ))}
          {(data?.reports ?? []).length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground text-center">{q.isLoading ? "Loading…" : "Nothing flagged."}</li>
          )}
        </ul>
      </Panel>

      <Panel padded={false}>
        <div className="px-5 pt-4 pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest threads</p></div>
        <ul className="divide-y divide-border">
          {(data?.posts ?? []).map((p) => (
            <li key={p.id} className={cn("px-5 py-3 text-sm", p.hiddenAt && "bg-slate-50")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium flex items-center gap-1.5">
                    {p.pinned && <Pin className="w-3.5 h-3.5 text-sky-600" />}
                    <Link to={postPath(p.id)} target="_blank" className="hover:underline truncate">{p.title}</Link>
                    {p.hiddenAt && <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">hidden{p.hiddenReason ? ` · ${p.hiddenReason}` : ""}</span>}
                    {p.reports > 0 && <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-[11px] font-semibold">{p.reports} report{p.reports === 1 ? "" : "s"}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.model ? `${p.make} ${p.model}` : `All ${p.make}`} · {p.author} · {when(p.createdAt)} · {p.replies} repl{p.replies === 1 ? "y" : "ies"}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{p.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button className={btn} disabled={act.isPending} onClick={() => run("post", p.id, p.hiddenAt ? "unhide" : "hide")}>{p.hiddenAt ? "Unhide" : "Hide"}</button>
                  <button className={btn} disabled={act.isPending} onClick={() => run("post", p.id, p.pinned ? "unpin" : "pin")}>{p.pinned ? "Unpin" : "Pin"}</button>
                  <button className={cn(btn, "text-red-600")} disabled={act.isPending} onClick={() => run("post", p.id, "delete")}>Delete</button>
                </div>
              </div>
            </li>
          ))}
          {(data?.posts ?? []).length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground text-center">{q.isLoading ? "Loading…" : "No threads yet."}</li>
          )}
        </ul>
      </Panel>
    </>
  );
}
