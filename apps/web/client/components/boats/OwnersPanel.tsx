import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import PostRow from "@/components/community/PostRow";
import NewPostDialog from "@/components/community/NewPostDialog";
import { useCommunityFeed } from "@/hooks/use-community";
import { groupPath, isGroupable } from "@shared/community/community";

/** On a boat card: the latest threads from owners of the same model, and the way in. */
export default function OwnersPanel({ boat }: { boat: { make: string; model: string } }) {
  const groupable = isGroupable(boat.make, boat.model);
  const feed = useCommunityFeed(groupable ? boat.make : undefined, boat.model, 3);
  const [composing, setComposing] = useState(false);
  if (!groupable) return null;

  const group = feed.data?.group;
  const posts = feed.data?.posts ?? [];
  const to = groupPath(boat.make, boat.model);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Users className="w-3.5 h-3.5" /> {boat.make} {boat.model} owners
        </p>
        {group && (
          <Link to={to} className="text-xs font-semibold text-sky-700 hover:underline">
            {group.owners} owner{group.owners === 1 ? "" : "s"} · {group.posts} thread{group.posts === 1 ? "" : "s"} →
          </Link>
        )}
      </div>
      {feed.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Checking the board…</p>
      ) : feed.data === null ? (
        <p className="mt-2 text-xs text-muted-foreground">The owners' board isn't available right now.</p>
      ) : posts.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No threads yet from other {boat.model} owners. Ask the first question and anyone who adds one later finds it.
        </p>
      ) : (
        <ul className="mt-2 -mx-5 divide-y divide-border border-y border-border">
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {group?.canPost && (
          <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">
            <Plus className="w-3.5 h-3.5" /> Start a thread
          </button>
        )}
        <Link to={to} className="text-xs font-semibold text-sky-700 hover:underline">Open the board →</Link>
      </div>
      {composing && <NewPostDialog open={composing} onOpenChange={setComposing} group={{ make: boat.make, model: boat.model }} />}
    </div>
  );
}
