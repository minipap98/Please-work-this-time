import { describe, expect, it } from "vitest";
import { formatProjectDate, mapBid, mapProject, type ProjectRow } from "./map";

describe("formatProjectDate", () => {
  it("returns empty string for missing dates", () => {
    expect(formatProjectDate(undefined)).toBe("");
    expect(formatProjectDate("")).toBe("");
  });

  it("formats a valid ISO timestamp", () => {
    const formatted = formatProjectDate("2026-08-25T12:00:00.000Z");
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/Aug/);
  });
});

describe("mapProject", () => {
  it("maps a supabase row onto the UI Project shape", () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      owner_id: "owner-1",
      boat_id: null,
      title: "Annual service",
      description: "Oil and impeller",
      status: "bidding",
      category: "Engine Service",
      location: "Fort Lauderdale",
      chosen_bid_id: null,
      date: "2026-08-25T00:00:00.000Z",
      expires_at: null,
      metadata: { haulOutRequired: true, workLocation: "at_marina" },
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
      boat: {
        name: "No Vacancy",
        make: "Sea Ray",
        model: "SDX 250",
        year: "2020",
        propulsion: "Mercury Verado 250",
        engine_make: null,
        engine_model: null,
        engine_count: null,
        hull_id: null,
        home_port: null,
        length_ft: null,
      },
      photos: [{ url: "https://cdn.example/p.jpg", sort_order: 0 }],
      bids: [
        {
          id: "bid-1",
          project_id: "11111111-1111-1111-1111-111111111111",
          vendor_id: "vendor-1",
          price: 850,
          message: "We can do this Friday",
          submitted_at: "2026-08-25T01:00:00.000Z",
          expiry_date: null,
          accepted: null,
          rejected: false,
          created_at: "2026-08-25T01:00:00.000Z",
          updated_at: "2026-08-25T01:00:00.000Z",
          vendor: { id: "vendor-1", user_id: "user-vendor-1", business_name: "Harbor Marine", initials: "HM", completed_jobs: 12, phone: "305-555-0100" },
          line_items: [{ description: "Labor", quantity: 4, unit_price: 150 }],
          messages: [],
        },
      ],
    } satisfies ProjectRow;

    const project = mapProject(row);
    expect(project.title).toBe("Annual service");
    expect(project.status).toBe("bidding");
    expect(project.haulOutRequired).toBe(true);
    expect(project.workLocation).toBe("at_marina");
    expect(project.photos).toEqual(["https://cdn.example/p.jpg"]);
    expect(project.boat?.make).toBe("Sea Ray");
    expect(project.bids).toHaveLength(1);
    expect(project.bids[0].vendorName).toBe("Harbor Marine");
    expect(project.bids[0].price).toBe(850);
    expect(project.bids[0].lineItems?.[0].unitPrice).toBe(150);
  });
});

describe("mapBid", () => {
  it("falls back to Vendor when the profile is missing", () => {
    const bid = mapBid({
      id: "bid-2",
      project_id: "p",
      vendor_id: "v",
      price: 0,
      message: null,
      submitted_at: "2026-08-25T00:00:00.000Z",
      expiry_date: null,
      accepted: null,
      rejected: false,
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
    });
    expect(bid.vendorName).toBe("Vendor");
    expect(bid.price).toBe(0);
  });
});

describe("bid thread attribution", () => {
  it("labels messages by the vendor's user id, not the (private) sender profile", () => {
    const bid = mapBid({
      id: "bid-1",
      project_id: "p-1",
      vendor_id: "vp-1",
      price: 500,
      message: "",
      submitted_at: "2026-08-25T00:00:00.000Z",
      expiry_date: null,
      vendor: { id: "vp-1", user_id: "vendor-user", business_name: "Harbor Marine", initials: "HM", completed_jobs: 0, phone: null },
      line_items: [],
      messages: [
        { sender_id: "vendor-user", text: "Can do Tuesday", created_at: "2026-08-25T01:00:00.000Z", is_quote: false, quote_title: null, quote_price: null, quote_description: null },
        { sender_id: "owner-user", text: "Great", created_at: "2026-08-25T02:00:00.000Z", is_quote: false, quote_title: null, quote_price: null, quote_description: null },
      ],
    } as unknown as Parameters<typeof mapBid>[0]);
    expect(bid.thread.map((m) => m.from)).toEqual(["vendor", "user"]);
  });
});
