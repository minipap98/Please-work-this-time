// ── Owner-facing maintenance reminders based on completed service projects ──

import { getAugmentedProjects, getLocalProjectStatus } from "@/data/bidUtils";
import { SERVICE_INTERVALS } from "@/data/vendorRetentionUtils";

export interface OwnerMaintenanceReminder {
  boatName: string;
  boatLabel: string;
  category: string;
  lastServiceTitle: string;
  lastServiceDate: string;
  monthsSince: number;
  suggestedFollowUp: string;
  urgency: "overdue" | "upcoming";
}

export function getOwnerMaintenanceReminders(): OwnerMaintenanceReminder[] {
  const projects = getAugmentedProjects();

  // Filter to completed projects that have a boat and category
  const completed = projects.filter((p) => {
    const status = getLocalProjectStatus(p.id, p.status);
    return status === "completed" && p.boat && p.category;
  });

  // Group by boat name + category, keep most recent per group
  const groups = new Map<
    string,
    { boatName: string; boatLabel: string; category: string; title: string; date: string }
  >();

  for (const p of completed) {
    const boat = p.boat!;
    const key = `${boat.name}::${p.category}`;
    const existing = groups.get(key);

    const isMostRecent =
      !existing ||
      (() => {
        try {
          return new Date(p.date).getTime() > new Date(existing.date).getTime();
        } catch {
          return false;
        }
      })();

    if (isMostRecent) {
      groups.set(key, {
        boatName: boat.name,
        boatLabel: `${boat.year} ${boat.make} ${boat.model}`,
        category: p.category!,
        title: p.title,
        date: p.date,
      });
    }
  }

  const now = new Date();
  const reminders: OwnerMaintenanceReminder[] = [];

  for (const [, entry] of groups) {
    const interval = SERVICE_INTERVALS[entry.category];
    if (!interval) continue;

    let monthsSince: number;
    try {
      const serviceDate = new Date(entry.date);
      monthsSince = Math.round(
        (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
    } catch {
      continue;
    }

    let urgency: "overdue" | "upcoming" | "ok";
    if (monthsSince >= interval.months) {
      urgency = "overdue";
    } else if (monthsSince >= interval.months - 2) {
      urgency = "upcoming";
    } else {
      urgency = "ok";
    }

    if (urgency === "ok") continue; // Only show actionable reminders

    reminders.push({
      boatName: entry.boatName,
      boatLabel: entry.boatLabel,
      category: entry.category,
      lastServiceTitle: entry.title,
      lastServiceDate: entry.date,
      monthsSince,
      suggestedFollowUp: interval.followUp,
      urgency,
    });
  }

  // Sort: overdue first, then upcoming
  reminders.sort((a, b) => {
    if (a.urgency === "overdue" && b.urgency !== "overdue") return -1;
    if (a.urgency !== "overdue" && b.urgency === "overdue") return 1;
    return b.monthsSince - a.monthsSince;
  });

  return reminders;
}

// ── Owner spending by boat / year ───────────────────────────────────────────

export interface OwnerYearProject {
  title: string;
  category: string;
  vendorName: string;
  price: number;
  date: string;
}

export interface OwnerBoatYearSpend {
  year: number;
  total: number;
  projectCount: number;
  projects: OwnerYearProject[];
}

export interface OwnerBoatSpending {
  boatName: string;
  boatLabel: string;
  years: OwnerBoatYearSpend[];
  grandTotal: number;
}

export function getOwnerSpendingByBoat(): OwnerBoatSpending[] {
  // Determine the owner's boat name from localStorage (default: "No Vacancy")
  let ownerBoatName = "No Vacancy";
  try {
    const b = JSON.parse(localStorage.getItem("my_boat") ?? "null");
    if (b && b.name) ownerBoatName = b.name;
  } catch {}

  const projects = getAugmentedProjects();

  const completed = projects.filter((p) => {
    const status = getLocalProjectStatus(p.id, p.status);
    return status === "completed" && p.boat && p.chosenBidId && p.boat.name === ownerBoatName;
  });

  const boatMap = new Map<string, { boatLabel: string; yearMap: Map<number, { total: number; count: number; projects: OwnerYearProject[] }> }>();

  for (const p of completed) {
    const boat = p.boat!;
    const bid = p.bids.find((b) => b.id === p.chosenBidId);
    if (!bid) continue;

    let year: number;
    try {
      year = new Date(p.date).getFullYear();
    } catch {
      continue;
    }

    let entry = boatMap.get(boat.name);
    if (!entry) {
      entry = { boatLabel: `${boat.year} ${boat.make} ${boat.model}`, yearMap: new Map() };
      boatMap.set(boat.name, entry);
    }

    const ym = entry.yearMap.get(year) ?? { total: 0, count: 0, projects: [] };
    ym.total += bid.price;
    ym.count += 1;
    ym.projects.push({
      title: p.title,
      category: p.category ?? "General",
      vendorName: bid.vendorName,
      price: bid.price,
      date: p.date,
    });
    entry.yearMap.set(year, ym);
  }

  const result: OwnerBoatSpending[] = [];
  for (const [boatName, entry] of boatMap) {
    const years: OwnerBoatYearSpend[] = [];
    let grandTotal = 0;
    for (const [year, ym] of entry.yearMap) {
      ym.projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      years.push({ year, total: ym.total, projectCount: ym.count, projects: ym.projects });
      grandTotal += ym.total;
    }
    years.sort((a, b) => b.year - a.year);
    result.push({ boatName, boatLabel: entry.boatLabel, years, grandTotal });
  }

  result.sort((a, b) => a.boatName.localeCompare(b.boatName));
  return result;
}
