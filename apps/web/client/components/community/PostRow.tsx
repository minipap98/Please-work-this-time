import { Link } from "react-router-dom";
import { MessageSquare, Pin } from "lucide-react";
import { excerpt, lastActivity, postPath, type CommunityPost } from "@shared/community/community";
import AuthorLine from "./AuthorLine";

/** One thread in a list: title, a line of the body, who asked, how many answered. */
export default function PostRow({ post, showGroup = false }: { post: CommunityPost; showGroup?: boolean }) {
  return (
    <li>
      <Link to={postPath(post.id)} className="block px-5 py-4 hover:bg-sky-50/40 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              {post.pinned && <Pin className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
              <span className="truncate">{post.title}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{excerpt(post.body, 200)}</p>
            {showGroup && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {post.model ? `${post.make} ${post.model}` : `All ${post.make}`}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5" /> {post.replies}
          </span>
        </div>
        <AuthorLine author={post.author} boat={post.authorBoat} when={lastActivity(post)} className="mt-3" />
      </Link>
    </li>
  );
}
