import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { countPdfPages } from "./pdf";

/** A minimal classic PDF with n pages (page objects in plain text). */
function plainPdf(n: number): Buffer {
  const kids = Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(" ");
  const pages = Array.from({ length: n }, (_, i) => `${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n`).join("");
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${n} >>\nendobj\n${pages}trailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
}

/** A PDF 1.5 file whose page objects live in a compressed object stream. */
function objStmPdf(n: number): Buffer {
  const objs = Array.from({ length: n }, (_, i) => `${3 + i} 0 << /Type /Page /Parent 2 0 R >>`).join("\n");
  const deflated = deflateSync(Buffer.from(objs, "latin1"));
  const head = Buffer.from(`%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n10 0 obj\n<< /Type /ObjStm /N ${n} /First 0 /Filter /FlateDecode /Length ${deflated.length} >>\nstream\n`, "latin1");
  const tail = Buffer.from(`\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, "latin1");
  return Buffer.concat([head, deflated, tail]);
}

describe("countPdfPages", () => {
  it("counts plain page objects", () => {
    expect(countPdfPages(plainPdf(1))).toBe(1);
    expect(countPdfPages(plainPdf(7))).toBe(7);
  });

  it("counts pages hidden in compressed object streams", () => {
    expect(countPdfPages(objStmPdf(12))).toBe(12);
  });

  it("does not count the /Pages tree node or image streams as pages", () => {
    const pdf = Buffer.from("%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n5 0 obj\n<< /Type /XObject /Subtype /Image /Filter /FlateDecode /Length 3 >>\nstream\nabc\nendstream\nendobj\n", "latin1");
    // No page objects at all: falls back to the tree's /Count.
    expect(countPdfPages(pdf)).toBe(0);
  });

  it("returns null for something that isn't a PDF", () => {
    expect(countPdfPages(Buffer.from("hello"))).toBeNull();
  });
});
