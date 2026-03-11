import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import { VENDOR_PAST_PROJECTS } from "@/data/projectData";

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

const SPECIALTIES_ALL = Array.from(
  new Set(Object.values(getAllVendorProfiles()).flatMap((v) => v.specialties))
).sort();

export default function BrowseVendors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("All");

  const vendors = Object.values(getAllVendorProfiles()).filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filterSpecialty === "All" || v.specialties.includes(filterSpecialty);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Browse Vendors</h1>
          <p className="text-sm text-muted-foreground">
            Find verified marine service professionals in your area
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search vendors or specialties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="All">All Specialties</option>
            {SPECIALTIES_ALL.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} found
        </p>

        {/* Vendor cards */}
        <div className="space-y-4">
          {vendors.map((vendor) => {
            const pastWork = VENDOR_PAST_PROJECTS[vendor.name] ?? [];
            return (
              <div
                key={vendor.name}
                className="border border-border rounded-lg p-5 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/vendor/${encodeURIComponent(vendor.name)}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {vendor.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">{vendor.name}</h2>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3 h-3 ${star <= Math.round(vendor.rating) ? "text-amber-400" : "text-gray-200"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d={STAR_PATH} />
                            </svg>
                          ))}
                          <span className="text-xs text-muted-foreground ml-0.5">
                            {vendor.rating} ({vendor.reviewCount.toLocaleString()})
                          </span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {vendor.insured && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Insured
                          </span>
                        )}
                        {vendor.licensed && (
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            Licensed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Responds {vendor.responseTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {vendor.completedJobs.toLocaleString()} jobs
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {vendor.serviceArea.split("·")[0].trim()}
                      </span>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {vendor.specialties.map((s) => (
                        <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {pastWork.length} past project{pastWork.length !== 1 ? "s" : ""} on Bosun
                  </span>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    View profile
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
