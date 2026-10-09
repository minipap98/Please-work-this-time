import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCreatePost } from "@/hooks/use-community";
import { useMyBoats } from "@/hooks/use-my-boat";
import { communityKey, groupLabel, postPath, postProblem, POST_BODY_MAX, POST_TITLE_MAX } from "@shared/community/community";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition";

/** Start a thread in one group. The group comes from the page, the boat it's about from My Boats. */
export default function NewPostDialog({
  open, onOpenChange, group,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  group: { make: string; model: string | null };
}) {
  const navigate = useNavigate();
  const create = useCreatePost();
  const { boats } = useMyBoats();
  const matching = boats.filter(
    (b) => communityKey(b.make) === communityKey(group.make) && (!group.model || communityKey(b.model) === communityKey(group.model)),
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [boatId, setBoatId] = useState<string>(matching[0]?.id ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setBody("");
    setPhoto(null);
    setError("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = postProblem({ title, body });
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    try {
      const id = await create.mutateAsync({ make: group.make, model: group.model, title, body, boatId: boatId || null, photo });
      reset();
      onOpenChange(false);
      navigate(postPath(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogTitle>New thread · {groupLabel(group)}</DialogTitle>
        <DialogDescription>
          Other owners see your first name, last initial and which boat you own. Keep it to what another {group.make} owner would want to know.
        </DialogDescription>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, POST_TITLE_MAX))}
            placeholder="What's it about? e.g. Livewell pump replacement"
            className={inputCls}
            autoFocus
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, POST_BODY_MAX))}
            placeholder="Details: hours, symptoms, what you tried, what the shop said."
            rows={6}
            className={inputCls}
            required
          />
          {matching.length > 1 && (
            <label className="block text-sm">
              <span className="text-xs font-semibold text-muted-foreground">About which boat?</span>
              <select value={boatId} onChange={(e) => setBoatId(e.target.value)} className={`${inputCls} mt-1`}>
                {matching.map((b) => (
                  <option key={b.id} value={b.id}>{b.name ? `${b.name} · ` : ""}{b.year} {b.make} {b.model}</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-sm text-sky-700 font-semibold cursor-pointer hover:underline">
              <ImagePlus className="w-4 h-4" /> {photo ? "Change photo" : "Add a photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            {photo && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {photo.name}
                <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-border bg-white hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
              {create.isPending ? "Posting…" : "Post thread"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
