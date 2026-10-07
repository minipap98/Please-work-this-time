import { describe, expect, it } from "vitest";
import { EMPTY_BOAT_FORM, boatFormFromRow, boatRowFromForm, boatSubtitle, boatTitle, engineDisplay, pickActiveBoat, type BoatRow } from "./boats";

const row = (p: Partial<BoatRow> = {}): BoatRow =>
  ({
    id: "b1", owner_id: "u1", name: "No Vacancy", make: "Sea Ray", model: "SDX 250 OB", year: "2020",
    engine_type: "Outboard", engine_make: "Mercury", engine_model: "Verado 250 (2021–present)", engine_count: 2,
    home_port: "Key Biscayne, FL 33149", home_port_lat: 25.69, home_port_lng: -80.16, home_port_place_id: null,
    photo_url: null, photo_frame: null, propulsion: null, length_ft: null, registration_number: null, hull_id: null,
    created_at: "", updated_at: "", ...p,
  }) as BoatRow;

describe("boat labels", () => {
  it("shows the engine count only for outboards and strips the catalog's year range", () => {
    expect(engineDisplay(row())).toBe("Twin Mercury Verado 250");
    expect(engineDisplay(row({ engine_count: 1 }))).toBe("Mercury Verado 250");
    expect(engineDisplay(row({ engine_type: "Inboard", engine_count: 2, engine_make: "Volvo", engine_model: "D6-440" }))).toBe("Volvo D6-440");
  });

  it("titles the banner with the name, else year/make/model, else My Boat", () => {
    expect(boatTitle(row())).toBe("No Vacancy");
    expect(boatTitle(row({ name: "" }))).toBe("2020 Sea Ray SDX 250 OB");
    expect(boatTitle(row({ name: "", make: "Unknown", model: "Unknown", year: "" }))).toBe("My Boat");
    expect(boatTitle(null)).toBe("My Boat");
    expect(boatSubtitle(row())).toBe("2020 Sea Ray SDX 250 OB · Twin Mercury Verado 250");
    expect(boatSubtitle(row({ name: "" }))).toBe("Twin Mercury Verado 250");
  });
});

describe("active boat", () => {
  it("follows the stored pointer and falls back to the first boat added", () => {
    const boats = [{ id: "new" }, { id: "old" }];
    expect(pickActiveBoat(boats, "new")?.id).toBe("new");
    expect(pickActiveBoat(boats, "gone")?.id).toBe("old");
    expect(pickActiveBoat(boats, null)?.id).toBe("old");
    expect(pickActiveBoat([], null)).toBeNull();
  });
});

describe("boat form", () => {
  it("round-trips a row, keeping the verified port and its coordinates", () => {
    const f = boatFormFromRow(row());
    expect(f.engineCount).toBe("Twin");
    expect(f.homePort).toMatchObject({ label: "Key Biscayne, FL 33149", lat: 25.69, lng: -80.16, source: "zip" });
    const saved = boatRowFromForm(f);
    expect(saved).toMatchObject({ name: "No Vacancy", engine_count: 2, home_port: "Key Biscayne, FL 33149", home_port_lat: 25.69, home_port_lng: -80.16, home_port_place_id: null });
  });

  it("fills the web's defaults and clears stale coordinates when the port is unverified text", () => {
    const saved = boatRowFromForm({ ...EMPTY_BOAT_FORM, homePortLabel: "Somewhere" }, new Date("2026-05-01"));
    expect(saved).toMatchObject({ name: "My Boat", make: "Unknown", model: "Unknown", year: "2026", engine_type: null, engine_count: 1, home_port: "Somewhere", home_port_lat: null, home_port_lng: null });
  });

  it("ignores the engine count for inboards", () => {
    expect(boatRowFromForm({ ...EMPTY_BOAT_FORM, engineType: "Inboard", engineCount: "Twin" }).engine_count).toBe(1);
    expect(boatRowFromForm({ ...EMPTY_BOAT_FORM, engineType: "Outboard", engineCount: "Triple" }).engine_count).toBe(3);
  });
});
