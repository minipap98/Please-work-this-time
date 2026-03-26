import { useParams, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import ReviewsList from "@/components/ReviewsList";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import { VENDOR_PAST_PROJECTS } from "@/data/projectData";
import { useRole } from "@/context/RoleContext";

const VendorMap = lazy(() => import("@/components/VendorMap"));

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export default function VendorProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { role, vendorId } = useRole();
  const decodedName = decodeURIComponent(name ?? "");
  const vendor = getAllVendorProfiles()[decodedName];
  const pastWork = VENDOR_PAST_PROJECTS[decodedName] ?? [];
  const isOwnProfile = role === "vendor" && vendorId === decodedName;

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-muted-foreground">Vendor not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header card */}
        <div className="border border-border rounded-lg p-6 mb-8">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
              {vendor.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">{vendor.name}</h1>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(vendor.rating) ? "text-amber-400" : "text-gray-200"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d={STAR_PATH} />
                      </svg>
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">
                      {vendor.rating} ({vendor.reviewCount.toLocaleString()} reviews)
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {vendor.insured && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      ✓ Insured
                    </span>
                  )}
                  {vendor.licensed && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                      ✓ Licensed
                    </span>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-lg font-bold text-foreground">{vendor.completedJobs.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Jobs completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{vendor.yearsInBusiness} yrs</p>
                  <p className="text-xs text-muted-foreground">In business</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{vendor.responseTime}</p>
                  <p className="text-xs text-muted-foreground">Response time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* About */}
          <div className="md:col-span-2 space-y-6">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{vendor.bio}</p>
            </section>

            {/* Past work */}
            {pastWork.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-foreground mb-3">
                  Past Work on Bosun
                </h2>
                <div className="space-y-3">
                  {pastWork.map((project, i) => (
                    <div key={i} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-foreground">{project.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{project.completedDate}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
                        <span>{project.boatInfo}</span>
                        <span>{project.engineInfo}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex gap-0.5 mt-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg
                              key={s}
                              className={`w-3 h-3 ${s <= project.review.stars ? "text-amber-400" : "text-gray-200"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d={STAR_PATH} />
                            </svg>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground italic">"{project.review.comment}"</p>
                          <p className="text-xs text-muted-foreground mt-0.5">— {project.review.reviewer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews from Supabase */}
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">
                Reviews
              </h2>
              <ReviewsList vendorId={decodedName} />
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <section className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-1.5">
                {vendor.specialties.map((s) => (
                  <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </section>

            {vendor.certifications.length > 0 && (
              <section className="border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Certifications</h3>
                <ul className="space-y-1.5">
                  {vendor.certifications.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Service Area</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{vendor.serviceArea}</p>
              {vendor.lat != null && vendor.lng != null && (
                <Suspense fallback={
                  <div className="h-[200px] bg-muted/30 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Loading map…</span>
                  </div>
                }>
                  <VendorMap vendors={[vendor]} height="200px" />
                </Suspense>
              )}
            </section>

            {isOwnProfile ? (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">This is your public profile</p>
                <p className="text-xs text-amber-600">This is how boat owners see you on Bosun.</p>
              </div>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Post a Project
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
