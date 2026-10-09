import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { PageContainer, PageHeader, Panel } from "@/components/app/Page";
import PostRow from "@/components/community/PostRow";
import NewPostDialog from "@/components/community/NewPostDialog";
import { useCommunityFeed } from "@/hooks/use-community";
import { groupLabel, groupPath, titleFromKey } from "@shared/community/community";

/** /owners/:make and /owners/:make/:model — one group's board. */
export default function OwnersBoard() {
  const { make = "", model } = useParams<{ make: string; model?: string }>();
  const feed = useCommunityFeed(make, model ?? null);
  const [composing, setComposing] = useState(false);

  const group = feed.data?.group ?? { make: titleFromKey(make), model: model ? titleFromKey(model) : null, makeKey: make, modelKey: model ?? null, owners: 0, posts: 0, canPost: false };
  const posts = feed.data?.posts ?? [];

  return (
    <PageContainer className="max-w-3xl">
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/owners" className="hover:text-foreground">Owners</Link>
        <ChevronRight className="w-3 h-3" />
        {group.model ? (
          <>
            <Link to={groupPath(group.makeKey)} className="hover:text-foreground">{group.make}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{group.model}</span>
          </>
        ) : (
          <span className="text-foreground">{group.make}</span>
        )}
      </nav>
      <PageHeader
        eyebrow="Community"
        title={groupLabel(group)}
        description={
          feed.isLoading
            ? "Loading…"
            : `${group.owners} owner${group.owners === 1 ? "" : "s"} on Bosun · ${group.posts} thread${group.posts === 1 ? "" : "s"}${group.model ? "" : " across every model"}`
        }
        actions={
          group.canPost ? (
            <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" /> Start a thread
            </button>
          ) : feed.data ? (
            <span className="text-xs text-muted-foreground max-w-[220px] text-right">
              Add a {group.model ? `${group.make} ${group.model}` : group.make} to My Boats to post here. Reading is open to every owner.
            </span>
          ) : null
        }
      />

      {feed.isError && <Panel className="mb-4 text-sm text-red-600">Couldn't load this board. {feed.error instanceof Error ? feed.error.message : ""}</Panel>}
      {feed.data === null && !feed.isLoading && !feed.isError && (
        <Panel className="mb-4 text-sm text-muted-foreground">The owners' community is for boat owners. Shops don't take part.</Panel>
      )}

      <Panel padded={false}>
        <ul className="divide-y divide-border">
          {posts.map((p) => <PostRow key={p.id} post={p} showGroup={!group.model} />)}
          {feed.isLoading && <li className="px-5 py-6 text-sm text-muted-foreground">Loading threads…</li>}
          {!feed.isLoading && feed.data && posts.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              <p>No threads yet.</p>
              {group.canPost && <p className="mt-1">Start one: the other {Math.max(0, group.owners - 1)} owner{group.owners === 2 ? "" : "s"} get it on their board.</p>}
            </li>
          )}
        </ul>
      </Panel>

      {group.model && (
        <p className="mt-4 text-sm text-muted-foreground">
          Looking for something broader?{" "}
          <Link to={groupPath(group.makeKey)} className="font-semibold text-sky-700 hover:underline">All {group.make} owners →</Link>
        </p>
      )}

      {composing && <NewPostDialog open={composing} onOpenChange={setComposing} group={{ make: group.make, model: group.model }} />}
    </PageContainer>
  );
}
