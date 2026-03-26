import { useEffect, useRef, useState } from "react";
import type { VendorProfile } from "@/data/vendorData";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 25.82, lng: -80.19 };
const DEFAULT_ZOOM = 11;

interface VendorMapProps {
  vendors: VendorProfile[];
  onVendorClick?: (vendorName: string) => void;
  height?: string;
}

// Load Google Maps script once
let loadPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export default function VendorMap({ vendors, onVendorClick, height = "400px" }: VendorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setSelectedVendor] = useState<VendorProfile | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const vendorsWithCoords = vendors.filter((v) => v.lat != null && v.lng != null);

  // Load script
  useEffect(() => {
    if (!API_KEY) { setError("Google Maps API key not configured"); return; }
    loadGoogleMaps().then(() => setLoaded(true)).catch(() => setError("Failed to load Google Maps"));
  }, []);

  // Init map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapId: "bosun-vendor-map",
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    });
    infoWindowRef.current = new google.maps.InfoWindow();
  }, [loaded]);

  // Update markers when vendors change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !loaded) return;

    // Clear existing
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    vendorsWithCoords.forEach((vendor) => {
      const pinDiv = document.createElement("div");
      pinDiv.innerHTML = `
        <div style="
          display:flex;align-items:center;gap:4px;
          background:white;color:#111;font-size:11px;font-weight:700;
          padding:4px 8px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.18);
          border:2px solid white;cursor:pointer;white-space:nowrap;
        ">
          <span>${vendor.initials}</span>
          <span style="color:#f59e0b;">★</span>
          <span style="font-size:10px;">${vendor.rating}</span>
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: vendor.lat!, lng: vendor.lng! },
        title: vendor.name,
        content: pinDiv,
      });

      marker.addListener("click", () => {
        setSelectedVendor(vendor);
        const iw = infoWindowRef.current;
        if (!iw) return;
        iw.setContent(buildInfoContent(vendor, !!onVendorClick));
        iw.open({ anchor: marker, map });

        // Attach click handler for "View Profile" link inside info window
        setTimeout(() => {
          const btn = document.getElementById(`vendor-iw-${vendor.name.replace(/\s/g, "-")}`);
          if (btn && onVendorClick) btn.onclick = () => onVendorClick(vendor.name);
        }, 100);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (vendorsWithCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      vendorsWithCoords.forEach((v) => bounds.extend({ lat: v.lat!, lng: v.lng! }));
      map.fitBounds(bounds, 50);
    } else if (vendorsWithCoords.length === 1) {
      map.setCenter({ lat: vendorsWithCoords[0].lat!, lng: vendorsWithCoords[0].lng! });
      map.setZoom(14);
    }
  }, [loaded, vendors, onVendorClick]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl border border-border" style={{ height }}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl border border-border" style={{ height }}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Loading map…
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} className="rounded-xl overflow-hidden border border-border" style={{ height, width: "100%" }} />
  );
}

function buildInfoContent(vendor: VendorProfile, hasClick: boolean): string {
  const badges = [
    vendor.insured ? `<span style="font-size:9px;font-weight:600;color:#047857;background:#ecfdf5;padding:2px 6px;border-radius:999px;">Insured</span>` : "",
    vendor.licensed ? `<span style="font-size:9px;font-weight:600;color:#1d4ed8;background:#eff6ff;padding:2px 6px;border-radius:999px;">Licensed</span>` : "",
  ].filter(Boolean).join(" ");

  const specs = vendor.specialties.slice(0, 3).map(
    (s) => `<span style="font-size:9px;background:#f3f4f6;color:#4b5563;padding:2px 6px;border-radius:999px;">${s}</span>`
  ).join(" ");

  const stars = [1, 2, 3, 4, 5].map(
    (s) => `<span style="color:${s <= Math.round(vendor.rating) ? "#f59e0b" : "#e5e7eb"};">★</span>`
  ).join("");

  const viewBtn = hasClick
    ? `<div style="text-align:center;margin-top:8px;">
         <a id="vendor-iw-${vendor.name.replace(/\s/g, "-")}" style="font-size:12px;font-weight:600;color:#2563eb;cursor:pointer;">View Profile →</a>
       </div>`
    : "";

  return `
    <div style="padding:4px;max-width:240px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:32px;height:32px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">
          ${vendor.initials}
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#111;">${vendor.name}</div>
          <div style="font-size:11px;">${stars} <span style="color:#9ca3af;margin-left:2px;">${vendor.rating} (${vendor.reviewCount})</span></div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${badges}
        <span style="font-size:9px;color:#9ca3af;">${vendor.completedJobs} jobs · ${vendor.yearsInBusiness} yrs</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${specs}
        ${vendor.specialties.length > 3 ? `<span style="font-size:9px;color:#9ca3af;">+${vendor.specialties.length - 3}</span>` : ""}
      </div>
      ${viewBtn}
    </div>
  `;
}
