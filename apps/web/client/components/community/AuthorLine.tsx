import { relativeTime } from "@shared/notifications/route";
import type { CommunityAuthor } from "@shared/community/community";
import { cn } from "@/lib/utils";

/** Who wrote it, which boat they own, and when. The boat is the badge that makes a reply worth reading. */
export default function AuthorLine({
  author, boat, when, size = "sm", className,
}: {
  author: CommunityAuthor;
  boat: string | null;
  when: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const avatar = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-[11px]";
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      {author.avatarUrl ? (
        <img src={author.avatarUrl} alt="" className={cn("rounded-full object-cover shrink-0", avatar)} />
      ) : (
        <span className={cn("rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0", avatar)}>
          {author.initials || author.name.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-semibold text-foreground truncate">
          {author.name}
          <span className="font-normal text-muted-foreground"> · {relativeTime(when)}</span>
        </p>
        {boat && <p className="text-xs text-muted-foreground truncate">Owns a {boat}</p>}
      </div>
    </div>
  );
}
