import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { MAPS_FAILED_EVENT, googleLibraries, googleMapsConfigured, mapsRenderFailed } from "@/lib/googleMaps";
import { zipToLocation, type PickedLocation } from "@shared/geo";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  main: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

/**
 * Search a real place (marina, address, town) with Google, see it on a map, and confirm it.
 * Falls back to a US ZIP code lookup when Google isn't available.
 */
export default function LocationPicker({
  value,
  onChange,
  placeholder = "Search a marina, address or town",
  confirmLabel = "Yes, this is the spot",
  className,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  placeholder?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<"search" | "zip">(googleMapsConfigured ? "search" : "zip");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PickedLocation | null>(null);
  const [zip, setZip] = useState("");
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const seq = useRef(0);

  // Suggestions as you type (debounced).
  useEffect(() => {
    if (mode !== "search" || query.trim().length < 3 || pending) {
      setSuggestions([]);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        await googleLibraries("places");
        token.current ??= new google.maps.places.AutocompleteSessionToken();
        const { suggestions: found } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query.trim(),
          sessionToken: token.current,
          includedRegionCodes: ["us", "bs", "vi", "pr"],
        });
        if (mine !== seq.current) return;
        setError(null);
        setSuggestions(
          found
            .map((s) => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => !!p)
            .slice(0, 6)
            .map((p) => ({
              id: p.placeId,
              main: p.mainText?.toString() ?? p.text.toString(),
              secondary: p.secondaryText?.toString() ?? "",
              prediction: p,
            }))
        );
      } catch {
        if (mine !== seq.current) return;
        setSuggestions([]);
        setError("Place search isn't available right now. Use your ZIP code instead.");
        setMode("zip");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, pending]);

  async function pick(s: Suggestion) {
    setBusy(true);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      token.current = null; // a session ends when a place is picked
      if (!place.location) throw new Error("no location");
      setPending({
        label: [s.main, s.secondary].filter(Boolean).join(", "),
        address: place.formattedAddress ?? null,
        lat: place.location.lat(),
        lng: place.location.lng(),
        placeId: place.id,
        source: "google",
      });
      setSuggestions([]);
    } catch {
      setError("Couldn't load that place. Try another, or use your ZIP code.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupZip() {
    const z = zip.trim();
    if (!/^\d{5}$/.test(z)) {
      setError("Enter a 5-digit ZIP code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${z}`);
      const loc = res.ok ? zipToLocation(z, await res.json()) : null;
      if (!loc) setError("We couldn't find that ZIP code.");
      else setPending(loc);
    } catch {
      setError("Couldn't look up that ZIP code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (value && !pending) {
    return (
      <div className={cn("flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3", className)}>
        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{value.label}</p>
          {value.address && value.address !== value.label && (
            <p className="text-xs text-muted-foreground truncate">{value.address}</p>
          )}
        </div>
        <button
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="text-xs font-semibold text-sky-700 hover:underline shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
        <MapPreview lat={pending.lat} lng={pending.lng} zoom={pending.source === "zip" ? 11 : 14} />
        <div className="p-3">
          <p className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" /> {pending.label}
          </p>
          {pending.address && pending.address !== pending.label && (
            <p className="pl-[22px] text-xs text-muted-foreground">{pending.address}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => {
                onChange(pending);
                setPending(null);
              }}
              className="px-3 py-2 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90"
            >
              {confirmLabel}
            </button>
            <button onClick={() => setPending(null)} className="text-sm text-muted-foreground hover:text-foreground">
              Pick a different place
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full border border-border rounded-md pl-9 pr-9 py-2.5 text-sm bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20";

  return (
    <div className={className}>
      {mode === "search" ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={inputCls}
            autoComplete="off"
          />
          {busy && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => pick(s)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground truncate">{s.main}</span>
                      {s.secondary && <span className="block text-xs text-muted-foreground truncate">{s.secondary}</span>}
                    </span>
                  </button>
                </li>
              ))}
              <li className="px-3 py-1 text-[10px] text-muted-foreground text-right">Powered by Google</li>
            </ul>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onKeyDown={(e) => e.key === "Enter" && lookupZip()}
            inputMode="numeric"
            placeholder="ZIP code"
            className="w-32 border border-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            onClick={lookupZip}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Look up"}
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-amber-700">{error}</p>}
      {googleMapsConfigured && (
        <button
          onClick={() => {
            setError(null);
            setMode(mode === "search" ? "zip" : "search");
          }}
          className="mt-1.5 text-xs text-sky-700 hover:underline"
        >
          {mode === "search" ? "Use a ZIP code instead" : "Search for a place instead"}
        </button>
      )}
    </div>
  );
}

function MapPreview({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!googleMapsConfigured || mapsRenderFailed());

  useEffect(() => {
    const onFail = () => setFailed(true);
    window.addEventListener(MAPS_FAILED_EVENT, onFail);
    return () => window.removeEventListener(MAPS_FAILED_EVENT, onFail);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!googleMapsConfigured || failed) return;
    // Google sometimes draws its own error panel without calling gm_authFailure; watch for it.
    const watch = new MutationObserver(() => {
      if (el.current?.querySelector(".gm-err-container, .gm-err-content")) setFailed(true);
    });
    if (el.current) watch.observe(el.current, { childList: true, subtree: true });
    googleLibraries("maps", "marker")
      .then(() => {
        if (cancelled || !el.current) return;
        const center = { lat, lng };
        const map = new google.maps.Map(el.current, {
          center,
          zoom,
          disableDefaultUI: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        new google.maps.Marker({ position: center, map });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      watch.disconnect();
    };
  }, [lat, lng, zoom, failed]);

  if (failed) {
    return (
      <div className="h-16 bg-sky-50 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3.5 h-3.5 text-sky-600" />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 hover:underline"
        >
          Check it on Google Maps
        </a>
      </div>
    );
  }
  return <div ref={el} className="h-40 bg-muted" />;
}
