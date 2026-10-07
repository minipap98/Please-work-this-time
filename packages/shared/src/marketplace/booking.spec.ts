import { describe, expect, it } from "vitest";
import { makeBooking, serviceWeekOptions } from "./booking";

describe("serviceWeekOptions", () => {
  it("starts next Monday and runs six Mon–Fri weeks", () => {
    const weeks = serviceWeekOptions(new Date(2026, 8, 2)); // Wed Sep 2 2026
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual({ index: 0, label: "Sep 7 – Sep 11", sublabel: "Next week" });
    expect(weeks[1].sublabel).toBe("In 2 weeks");
    expect(weeks[5].label).toBe("Oct 12 – Oct 16");
  });

  it("treats Sunday as the day before Monday", () => {
    expect(serviceWeekOptions(new Date(2026, 8, 6))[0].label).toBe("Sep 7 – Sep 11"); // Sun Sep 6
  });
});

describe("makeBooking", () => {
  it("records the labels the apps display", () => {
    const week = serviceWeekOptions(new Date(2026, 8, 2))[0];
    expect(makeBooking({ bidId: "b", vendorName: "Harbor Marine", week, timeId: "morning", notes: " bring fenders " })).toEqual({
      bidId: "b",
      vendorName: "Harbor Marine",
      week: "Sep 7 – Sep 11",
      time: "Morning",
      notes: "bring fenders",
    });
  });
});
