import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { useDemoMode } from "@/lib/demoMode";
import type { MarketInput, MyBidStat } from "@shared/insights";

/** Canned market for the demo shop: a mid-priced engine shop that wins when it's cheapest. */
function demoMarket(): MarketInput {
  const b = (category: string, price: number, peerMedian: number | null, lowest: boolean | null, won: boolean, decided = true): MyBidStat =>
    ({ category, price, peerMedian, lowest, won, decided });
  return {
    mine: [
      b("Engine Service", 640, 720, true, true),
      b("Engine Service", 1180, 1050, false, false),
      b("Engine Service", 890, 910, true, true),
      b("Engine Service", 1420, 1260, false, false),
      b("Engine Service", 760, 800, true, false),
      b("Engine Service", 2350, 2100, false, true),
      b("Engine Service", 980, 1010, true, true),
      b("Engine Service", 1290, 1150, false, false),
      b("Engine Service", 1050, null, null, false, false),
      b("Mechanical", 1850, 1600, false, false),
      b("Mechanical", 2400, 2200, false, true),
      b("Mechanical", 920, 1000, true, true),
      b("Mechanical", 1350, 1200, false, false),
      b("Electronics", 1100, 1150, true, true),
      b("Electronics", 780, 700, false, false),
      b("Bottom Work", 1650, 1400, false, false),
    ],
    market: [
      { category: "Engine Service", vendors: 9, bids: 142, decided: 118, wins: 31, medianPrice: 980 },
      { category: "Mechanical", vendors: 7, bids: 64, decided: 51, wins: 14, medianPrice: 1300 },
      { category: "Electronics", vendors: 5, bids: 38, decided: 30, wins: 9, medianPrice: 920 },
      { category: "Bottom Work", vendors: 4, bids: 22, decided: 18, wins: 5, medianPrice: 1350 },
    ],
  };
}

export function useMarketInsights(vendorId: string | null) {
  const { demo } = useDemoMode();
  return useQuery({
    queryKey: ["vendor-market-insights", demo ? "demo" : vendorId],
    queryFn: async (): Promise<MarketInput | null> => {
      if (demo) return demoMarket();
      if (supabaseMissing) return null;
      const { data, error } = await supabase.rpc("vendor_market_insights");
      if (error) throw error;
      return (data as unknown as MarketInput | null) ?? null;
    },
    enabled: demo || !!vendorId,
  });
}
