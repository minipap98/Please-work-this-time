// What the demo visitor sees in Owners: a few threads for the demo boat's model and make.
// Nothing here is written anywhere; the demo is read-only.
import type { CommunityFeed, CommunityGroup, CommunityPost, CommunityReply, CommunityThread } from "@shared/community/community";
import { communityKey } from "@shared/community/community";
import { DEMO_BOAT } from "./demoBoat";

const MAKE = DEMO_BOAT.make;
const MODEL = DEMO_BOAT.model;
const MK = communityKey(MAKE);
const MDK = communityKey(MODEL);

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const author = (id: string, name: string, initials: string) => ({ id, name, initials, avatarUrl: null });

const base = { make: MAKE, model: MODEL as string | null, makeKey: MK, modelKey: MDK as string | null, photoUrl: null, pinned: false, mine: false };

export const DEMO_POSTS: CommunityPost[] = [
  {
    ...base,
    id: "demo-post-1",
    title: "Power steering pump whine around 180 hours",
    body: "Started getting a whine from the pump on hard turns at idle. Fluid is full and clean. Is this the known pump issue on the SDX or something else? Shop quoted $640 to replace.",
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(30),
    replies: 3,
    lastReplyAt: hoursAgo(4),
    author: author("demo-u1", "Marcus T.", "MT"),
    authorBoat: `2020 ${MAKE} ${MODEL} · Mercury Verado 250`,
  },
  {
    ...base,
    id: "demo-post-2",
    title: "Bottom paint that holds up in a Biscayne slip?",
    body: "Second season in a wet slip at Rickenbacker. Last coat was gone in eight months. What are other SDX owners down here using?",
    createdAt: hoursAgo(80),
    updatedAt: hoursAgo(80),
    replies: 2,
    lastReplyAt: hoursAgo(26),
    author: author("demo-u2", "Elena R.", "ER"),
    authorBoat: `2021 ${MAKE} ${MODEL} · Mercury Verado 300`,
  },
  {
    ...base,
    id: "demo-post-3",
    title: "Tower speakers: what actually fit?",
    body: "Looking at 6.5\" cans for the tower. Did anyone go bigger without changing the clamps?",
    createdAt: hoursAgo(140),
    updatedAt: hoursAgo(140),
    replies: 0,
    lastReplyAt: null,
    author: author("demo-u3", "Dave K.", "DK"),
    authorBoat: `2019 ${MAKE} ${MODEL} · Mercury Verado 250`,
  },
  {
    ...base,
    model: null,
    modelKey: null,
    id: "demo-post-4",
    title: `${MAKE} owners raft-up, Miami, first Saturday`,
    body: "A few of us meet at Nixon sandbar the first Saturday of the month. All models welcome. Bring a line and a cooler.",
    createdAt: hoursAgo(200),
    updatedAt: hoursAgo(200),
    replies: 5,
    lastReplyAt: hoursAgo(50),
    author: author("demo-u4", "Priya S.", "PS"),
    authorBoat: `2018 ${MAKE} SLX 280 · Mercury Verado 300`,
  },
];

const DEMO_REPLIES: Record<string, CommunityReply[]> = {
  "demo-post-1": [
    { id: "r1", body: "Same noise at 160. It was the pump. Replaced under the extended warranty, shop had it done in a morning.", createdAt: hoursAgo(26), updatedAt: hoursAgo(26), author: author("demo-u2", "Elena R.", "ER"), authorBoat: `2021 ${MAKE} ${MODEL} · Mercury Verado 300`, mine: false },
    { id: "r2", body: "Check the belt tension first. Mine was the belt, not the pump, and that's a $40 fix.", createdAt: hoursAgo(12), updatedAt: hoursAgo(12), author: author("demo-u5", "Tom H.", "TH"), authorBoat: `2020 ${MAKE} ${MODEL} · Mercury Verado 250`, mine: false },
    { id: "r3", body: "Belt was fine on mine. Going with the pump. Thanks both.", createdAt: hoursAgo(4), updatedAt: hoursAgo(4), author: author("demo-u1", "Marcus T.", "MT"), authorBoat: `2020 ${MAKE} ${MODEL} · Mercury Verado 250`, mine: false },
  ],
  "demo-post-2": [
    { id: "r4", body: "Micron CSC, two coats, and a diver monthly. Fourteen months and counting.", createdAt: hoursAgo(60), updatedAt: hoursAgo(60), author: author("demo-u3", "Dave K.", "DK"), authorBoat: `2019 ${MAKE} ${MODEL} · Mercury Verado 250`, mine: false },
    { id: "r5", body: "Same here. The diver matters more than the paint.", createdAt: hoursAgo(26), updatedAt: hoursAgo(26), author: author("demo-u5", "Tom H.", "TH"), authorBoat: `2020 ${MAKE} ${MODEL} · Mercury Verado 250`, mine: false },
  ],
  "demo-post-4": [
    { id: "r6", body: "We'll be there with the 250.", createdAt: hoursAgo(150), updatedAt: hoursAgo(150), author: author("demo-u1", "Marcus T.", "MT"), authorBoat: `2020 ${MAKE} ${MODEL} · Mercury Verado 250`, mine: false },
    { id: "r7", body: "Count us in.", createdAt: hoursAgo(50), updatedAt: hoursAgo(50), author: author("demo-u2", "Elena R.", "ER"), authorBoat: `2021 ${MAKE} ${MODEL} · Mercury Verado 300`, mine: false },
  ],
};

export const DEMO_GROUPS: CommunityGroup[] = [
  { make: MAKE, model: null, makeKey: MK, modelKey: null, owners: 41, posts: 4 },
  { make: MAKE, model: MODEL, makeKey: MK, modelKey: MDK, owners: 12, posts: 3 },
];

export const DEMO_ACTIVE_GROUPS: CommunityGroup[] = [
  ...DEMO_GROUPS,
  { make: "Boston Whaler", model: "Outrage 280", makeKey: "boston-whaler", modelKey: "outrage-280", owners: 9, posts: 6 },
  { make: "Grady-White", model: null, makeKey: "grady-white", modelKey: null, owners: 27, posts: 5 },
];

export function demoFeed(make: string, model: string | null): CommunityFeed | null {
  const mk = communityKey(make);
  const mdk = model ? communityKey(model) : null;
  const group = DEMO_ACTIVE_GROUPS.find((g) => g.makeKey === mk && g.modelKey === mdk);
  const posts = DEMO_POSTS.filter((p) => p.makeKey === mk && (mdk === null || p.modelKey === mdk));
  return {
    group: group ? { ...group, canPost: mk === MK } : { make, model, makeKey: mk, modelKey: mdk, owners: 0, posts: 0, canPost: false },
    posts,
  };
}

export function demoThread(id: string): CommunityThread | null {
  const post = DEMO_POSTS.find((p) => p.id === id);
  if (!post) return null;
  return { post, replies: DEMO_REPLIES[id] ?? [], canReply: true };
}
