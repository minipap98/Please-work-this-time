// Vercel function for every /api/* route. The server is bundled by `pnpm build` (vercel.json's
// buildCommand) into dist/server/vercel.mjs before this file is packaged; see server/vercel.ts.
export { default } from "../dist/server/vercel.mjs";
