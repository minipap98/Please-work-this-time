import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useMyCrewMemberships } from "@/hooks/use-shop";
import VendorShop from "@/pages/vendor/VendorShop";

/** The shop board for a crew manager (not the shop's own login). */
export default function CrewShop() {
  const { user } = useAuth();
  const { data: memberships = [], isLoading } = useMyCrewMemberships(user?.id, "Dana");
  const managed = memberships.filter((m) => m.role === "manager");
  const [pick, setPick] = useState(0);
  const m = managed[Math.min(pick, managed.length - 1)];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
      </div>
    );
  }
  if (!m) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-sm font-semibold">You don't manage a shop on Bosun</p>
          <p className="text-sm text-muted-foreground">
            Ask the shop to set your crew role to Manager under Shop Settings → Crew logins.
          </p>
          <Link to="/tech" className="inline-block text-sm text-sky-700 hover:underline">Go to my jobs</Link>
        </div>
      </div>
    );
  }
  return (
    <>
      {managed.length > 1 && (
        <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex items-center gap-2 justify-center">
          Managing
          <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className="bg-slate-800 rounded px-1.5 py-0.5">
            {managed.map((x, i) => <option key={x.vendorId} value={i}>{x.shopName}</option>)}
          </select>
        </div>
      )}
      <VendorShop key={m.vendorId} vendorIdOverride={m.vendorId} managerMode shopName={m.shopName} />
    </>
  );
}
