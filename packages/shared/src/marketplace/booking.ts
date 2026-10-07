// The service window an owner picks when accepting a bid: one of the next six Mon–Fri weeks
// and a time of day. Saved on the job as metadata.booking.

export interface WeekOption {
  index: number;
  /** "Sep 7 – Sep 11" */
  label: string;
  /** "Next week", "In 2 weeks", … */
  sublabel: string;
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Six working weeks starting next Monday. */
export function serviceWeekOptions(today: Date = new Date()): WeekOption[] {
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date(nextMonday);
    start.setDate(nextMonday.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    return { index: i, label: `${fmt(start)} – ${fmt(end)}`, sublabel: i === 0 ? "Next week" : i === 1 ? "In 2 weeks" : `In ${i + 1} weeks` };
  });
}

export const BOOKING_TIME_OPTIONS = [
  { id: "morning", label: "Morning", sub: "8 am – 12 pm" },
  { id: "afternoon", label: "Afternoon", sub: "12 pm – 5 pm" },
  { id: "flexible", label: "Flexible", sub: "Either works" },
] as const;

export interface Booking {
  bidId: string;
  vendorName?: string;
  week: string;
  time: string;
  notes?: string;
}

export function makeBooking(input: { bidId: string; vendorName?: string; week: WeekOption; timeId: string; notes?: string }): Booking {
  return {
    bidId: input.bidId,
    vendorName: input.vendorName,
    week: input.week.label,
    time: BOOKING_TIME_OPTIONS.find((t) => t.id === input.timeId)?.label ?? input.timeId,
    notes: input.notes?.trim() || undefined,
  };
}
