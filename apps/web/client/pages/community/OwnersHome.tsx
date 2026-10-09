import { Link } from "react-router-dom";
import { Anchor, ChevronRight, Users } from "lucide-react";
import { PageContainer, PageHeader, Panel } from "@/components/app/Page";
import { useActiveGroups, useMyGroups } from "@/hooks/use-community";
import { groupLabel, groupPath, type CommunityGroup } from "@shared/community/community";

function GroupRow({ g }: { g: CommunityGroup }) {
  return (
    <li>
      <Link to={groupPath(g.makeKey, g.modelKey)} className="flex items-center gap-3 px-5 py-3.5 hover:bg-sky-50/40 transition-colors">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{groupLabel(g)}</p>
          <p className="text-xs text-muted-foreground">
            {g.owners} owner{g.owners === 1 ? "" : "s"} on Bosun · {g.posts} thread{g.posts === 1 ? "" : "s"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </Link>
    </li>
  );
}

/** /owners: the groups my boats put me in, and where the talk is across Bosun. */
export default function OwnersHome() {
  const mine = useMyGroups();
  const active = useActiveGroups();
  const myKeys = new Set((mine.data ?? []).map((g) => `${g.makeKey}/${g.modelKey ?? ""}`));
  const elsewhere = (active.data ?? []).filter((g) => !myKeys.has(`${g.makeKey}/${g.modelKey ?? ""}`));

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow="Community"
        title="Owners like you"
        description="Threads for people who own the same boat. Your boats put you in their groups; the badge next to a name shows what they run."
      />

      <Panel padded={false} className="mb-6">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your groups</p>
        </div>
        <ul className="divide-y divide-border">
          {(mine.data ?? []).map((g) => <GroupRow key={`${g.makeKey}/${g.modelKey ?? ""}`} g={g} />)}
          {mine.isLoading && <li className="px-5 py-6 text-sm text-muted-foreground">Finding your groups…</li>}
          {!mine.isLoading && (mine.data ?? []).length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">
              <p>Add a boat and you're in its owners' group.</p>
              <Link to="/my-boats" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline">
                <Anchor className="w-4 h-4" /> Go to My Boats
              </Link>
            </li>
          )}
        </ul>
      </Panel>

      {elsewhere.length > 0 && (
        <Panel padded={false}>
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where the talk is</p>
          </div>
          <ul className="divide-y divide-border">
            {elsewhere.map((g) => <GroupRow key={`${g.makeKey}/${g.modelKey ?? ""}`} g={g} />)}
          </ul>
        </Panel>
      )}
    </PageContainer>
  );
}
