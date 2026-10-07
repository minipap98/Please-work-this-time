import { describe, expect, it } from "vitest";
import { normalizeInvoice } from "../invoice";
import { invoiceToLogEntry, invoiceUploadPath, readInvoice } from "./invoiceRead";
import { pickReceiptBoat } from "./receipts";

const api = (ok: boolean, status: number, body: unknown) => ({
  post: async () => ({ ok, status, body: body as never }),
  get: async () => ({ ok, status, body: body as never }),
  notifyJob: async () => ({ ok, status, body: body as never }),
  createPaymentIntent: async () => ({ ok, status, body: body as never }),
});

describe("invoice reading", () => {
  it("puts uploads in the owner's own folder", () => {
    expect(invoiceUploadPath("u1", "b1", true, 5)).toBe("u1/invoices/b1/5.pdf");
    expect(invoiceUploadPath("u1", "b1", false, 5)).toBe("u1/invoices/b1/5.jpg");
  });

  it("returns the read invoice, or a reason to fill the form by hand", async () => {
    const read = await readInvoice(api(true, 200, { invoice: { shop: "Dean's", total: "1,200", lines: [] } }), "p");
    expect(read.status).toBe("read");
    if (read.status === "read") expect(read.invoice.total).toBe(1200);
    const off = await readInvoice(api(false, 503, { code: "not_configured", error: "x" }), "p");
    expect(off).toMatchObject({ status: "manual", path: "p" });
    if (off.status === "manual") expect(off.reason).toMatch(/isn't switched on/);
    const failed = await readInvoice(api(false, 422, { error: "Too many pages." }), "p");
    if (failed.status === "manual") expect(failed.reason).toMatch(/^Too many pages\./);
  });

  it("turns a read invoice into one Boat Log entry with the invoice number in the notes", () => {
    const inv = normalizeInvoice({ shop: "Dean's Marine", invoiceNumber: "123", date: "2026-02-01", title: "Service", category: "Drivetrain", laborHours: 2, lines: [{ kind: "part", description: "Impeller", quantity: 1, unitPrice: 50, amount: 50 }], tax: 5, total: null });
    const e = invoiceToLogEntry(inv, "b1", "u1/invoices/b1/1.pdf", "paid cash");
    expect(e).toMatchObject({ boatId: "b1", title: "Service", category: "Drivetrain", cost: 55, vendorName: "Dean's Marine", laborHours: 2, invoicePath: "u1/invoices/b1/1.pdf", invoiceNumber: "123" });
    expect(e.notes).toBe("paid cash\nInvoice #123");
    expect(e.lines).toEqual([{ kind: "part", description: "Impeller", quantity: 1, unitPrice: 50 }]);
  });
});

describe("receipt boat", () => {
  const boats = [
    { id: "a", name: "No Vacancy", label: "2020 Sea Ray SDX 250" },
    { id: "b", name: "Reel Time", label: "2018 Grady-White 236" },
  ];
  it("picks the boat the receipt names, else the active one, else the first", () => {
    expect(pickReceiptBoat({ extracted: normalizeInvoice({ boat: "Grady-White 236 'Reel Time'" }) }, boats, "a")?.id).toBe("b");
    expect(pickReceiptBoat({ extracted: normalizeInvoice({ boat: null }) }, boats, "b")?.id).toBe("b");
    expect(pickReceiptBoat({ extracted: null }, boats, null)?.id).toBe("a");
  });
});
