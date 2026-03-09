import { useNavigate, useParams } from "react-router-dom";
import { CREW_MEMBERS, ROLE_STYLES, AVAILABILITY_STYLES } from "@/data/crewData";

export default function CrewProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const member = CREW_MEMBERS.find((c) => c.id === id);

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Crew member not found.</p>
          <button onClick={() => navigate("/find-crew")} className="mt-3 text-sm font-medium text-primary hover:underline">
            Back to Find Crew
          </button>
        </div>
      </div>
    );
  }

  const roleStyle = ROLE_STYLES[member.role];
  const avail = AVAILABILITY_STYLES[member.availability];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/find-crew")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground leading-tight">{member.name}</h1>
            <p className="text-xs text-muted-foreground leading-tight">{member.role} · {member.location}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* ── Profile card ── */}
        <div className="bg-white rounded-xl border border-border mt-4 p-5">
          {/* Avatar + identity */}
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold ${roleStyle.avatar}`}>
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground leading-tight">{member.name}</h2>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-1 ${roleStyle.badge}`}>
                    {member.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                  <div className={`w-2 h-2 rounded-full ${avail.dot}`} />
                  <span className="text-xs text-muted-foreground">{avail.label}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{member.location}</p>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-base font-bold text-foreground">{member.rating}</span>
              </div>
              <p className="text-xs text-muted-foreground">{member.reviewCount} reviews</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{member.yearsExperience}</p>
              <p className="text-xs text-muted-foreground">Years exp.</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-foreground">${member.dayRate.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Per day</p>
            </div>
          </div>
        </div>

        {/* ── Bio ── */}
        <div className="bg-white rounded-xl border border-border mt-3 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
        </div>

        {/* ── Certifications ── */}
        <div className="bg-white rounded-xl border border-border mt-3 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Certifications & Qualifications</h3>
          <div className="flex flex-col gap-2">
            {member.certifications.map((cert) => (
              <div key={cert} className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-foreground">{cert}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Specialties ── */}
        {member.specialties && member.specialties.length > 0 && (
          <div className="bg-white rounded-xl border border-border mt-3 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {member.specialties.map((spec) => (
                <span key={spec} className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Languages ── */}
        {member.languages && member.languages.length > 0 && (
          <div className="bg-white rounded-xl border border-border mt-3 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {member.languages.map((lang) => (
                <span key={lang} className="text-sm px-3 py-1 rounded-full border border-border text-foreground font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Contact ── */}
        <div className="mt-4 flex flex-col gap-3">
          <button className="w-full py-3 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
            Send Enquiry
          </button>
          <button
            onClick={() => navigate("/find-crew")}
            className="w-full py-3 rounded-xl border border-border bg-white text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    </div>
  );
}
