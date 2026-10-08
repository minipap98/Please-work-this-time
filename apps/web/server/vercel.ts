import { createServer } from "./index.js";

/**
 * Entry for the Vercel function. `pnpm build` bundles this (with everything it pulls in from
 * packages/shared) into dist/server/vercel.mjs, and api/index.js re-exports it. Bundling matters:
 * the shared package uses extensionless relative imports (Metro needs them), which Node's ESM
 * loader can't resolve when Vercel traces the TypeScript files one by one.
 */
export default createServer();
