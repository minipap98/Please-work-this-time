import { inflateSync } from "node:zlib";

/**
 * Count the pages in a PDF without a PDF library. Page objects are `/Type /Page` dictionaries;
 * in PDF 1.5+ they often sit inside Flate-compressed object streams, so those are inflated and
 * scanned too. Returns null when nothing page-like was found (encrypted or unusual files), so
 * the caller can decide whether to allow it.
 */
export function countPdfPages(buf: Buffer): number | null {
  const PAGE = /\/Type\s*\/Page(?![s\w])/g;
  const text = buf.toString("latin1");
  let count = (text.match(PAGE) ?? []).length;

  // Inflate every Flate stream whose dictionary says it is an object stream (/Type /ObjStm) or
  // that we can't classify; page dictionaries only ever live in object streams.
  const streamRe = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(text))) {
    const dictStart = text.lastIndexOf("<<", m.index);
    const dict = dictStart >= 0 ? text.slice(dictStart, m.index) : "";
    if (!/FlateDecode/.test(dict)) continue;
    if (/\/Subtype\s*\/Image/.test(dict)) continue;
    if (!/\/Type\s*\/ObjStm/.test(dict)) continue;
    const start = m.index + m[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const inflated = inflateSync(buf.subarray(start, end)).toString("latin1");
      count += (inflated.match(PAGE) ?? []).length;
    } catch {
      // A stream we can't inflate is skipped; the page count may then be low, never high.
    }
  }

  if (count > 0) return count;
  // Fall back to the page tree's /Count when no page objects were visible.
  const root = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/) ?? text.match(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages/);
  return root ? Number(root[1]) : null;
}
