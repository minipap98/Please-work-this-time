import { PageContainer, PageHeader } from "@/components/app/Page";
import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useDemoMode } from "@/lib/demoMode";
import { useMyBoats, uploadBoatPhoto } from "@/hooks/use-my-boat";
import { useUpdateBoat } from "@/hooks/use-supabase";
import LocationPicker from "@/components/LocationPicker";
import type { PickedLocation } from "@shared/geo";

const STORAGE_KEY = "hero_image";
const DEFAULT_IMAGE = "https://cdn.builder.io/api/v1/image/assets%2F6d21a31dd9f5464480f247d960742b01%2Fbc990cddf7ea4c13b79484a350ac1943?format=webp&width=1400&height=700";

function getCroppedDataUrl(image: HTMLImageElement, crop: PixelCrop): string {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  // Cap the saved photo at 1600px wide so uploads stay small.
  const scale = Math.min(1, 1600 / (crop.width * scaleX));
  canvas.width = Math.round(crop.width * scaleX * scale);
  canvas.height = Math.round(crop.height * scaleY * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { demo } = useDemoMode();
  const { user, profile, updateProfile } = useAuth();
  const { primary } = useMyBoats();
  const updateBoat = useUpdateBoat();
  const [saving, setSaving] = useState(false);

  // Demo keeps the photo in this browser; live accounts store it on their primary boat.
  const [preview, setPreview] = useState<string>(
    demo ? localStorage.getItem(STORAGE_KEY) ?? DEFAULT_IMAGE : ""
  );

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null); // raw uploaded image
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [location, setLocation] = useState<string>(
    demo ? localStorage.getItem("user_location") ?? "" : ""
  );

  // Live accounts pick a verified place; `placeTouched` means the owner changed it here.
  const [place, setPlace] = useState<PickedLocation | null>(null);
  const [placeTouched, setPlaceTouched] = useState(false);
  useEffect(() => {
    if (demo || placeTouched || !profile) return;
    setPlace(
      profile.location && profile.location_lat != null && profile.location_lng != null
        ? { label: profile.location, address: null, lat: profile.location_lat, lng: profile.location_lng, placeId: profile.location_place_id ?? null, source: "google" }
        : null
    );
  }, [demo, placeTouched, profile]);

  useEffect(() => {
    if (demo) return;
    setPreview((p) => p || primary?.photo_url || "");
    setLocation((l) => l || profile?.location || "");
  }, [demo, primary?.photo_url, profile?.location]);
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Start with the whole photo selected; the hero sizes itself to whatever shape is saved.
    const { width, height } = e.currentTarget;
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
    setCompletedCrop({ unit: "px", x: 0, y: 0, width, height });
  }, []);

  function handleApplyCrop() {
    if (!imgRef.current || !completedCrop) return;
    const dataUrl = getCroppedDataUrl(imgRef.current, completedCrop);
    setPreview(dataUrl);
    setCropSrc(null);
  }

  async function handleSave() {
    if (demo) {
      localStorage.setItem(STORAGE_KEY, preview);
      localStorage.setItem("user_location", location);
      setSaved(true);
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate("/app");
      }, 700);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      if (preview && preview.startsWith("data:")) {
        if (!primary) throw new Error("Add your boat in My Boats first, then upload its photo.");
        const url = await uploadBoatPhoto(user.id, preview);
        await updateBoat.mutateAsync({ id: primary.id, photo_url: url });
      } else if (!preview && primary?.photo_url) {
        await updateBoat.mutateAsync({ id: primary.id, photo_url: null });
      }
      if (placeTouched && place) {
        await updateProfile({
          location: place.label,
          location_lat: place.lat,
          location_lng: place.lng,
          location_place_id: place.placeId,
        });
        if (primary) {
          await updateBoat.mutateAsync({
            id: primary.id,
            home_port: place.label,
            home_port_lat: place.lat,
            home_port_lng: place.lng,
            home_port_place_id: place.placeId,
          });
        }
      }
      setSaved(true);
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate("/app");
      }, 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setPreview(demo ? DEFAULT_IMAGE : "");
    setCropSrc(null);
    setSaved(false);
  }

  return (
    <div className="min-h-full">

      <PageContainer className="max-w-3xl">
        <PageHeader title="Settings" description="Your boat's photo and home port." />

        {/* Hero Photo section */}
        <section className="border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">Hero Photo</h2>
          <p className="text-sm text-muted-foreground mb-5">
            This is the main photo shown at the top of your dashboard.
          </p>

          {/* Crop UI */}
          {cropSrc ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Your whole photo is selected. Drag the corners to trim it if you like, then click <strong>Use this photo</strong>.
              </p>
              <div className="rounded-md overflow-hidden bg-gray-900 flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  minWidth={100}
                >
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    style={{ maxHeight: "24rem", width: "auto", maxWidth: "100%" }}
                  />
                </ReactCrop>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApplyCrop}
                  disabled={!completedCrop}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Use this photo
                </button>
                <button
                  onClick={() => setCropSrc(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="w-full rounded-md overflow-hidden bg-gray-100 mb-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="Hero preview"
                    className="block w-full h-auto max-h-96 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-full h-52 flex items-center justify-center text-sm text-muted-foreground">
                    No photo yet
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4m0 0l4 4m-4-4v9M20 12a8 8 0 10-16 0" />
                  </svg>
                  Upload Photo
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset to default
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </section>

        {/* Location section */}
        {!cropSrc && (
          <section className="border border-border rounded-lg p-6 mt-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Location</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your marina or home port, shown on your dashboard.
            </p>
            {demo ? (
              <input
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setSaved(false); }}
                placeholder="e.g. Miami, FL · Biscayne Bay Marina"
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <>
                {!place && profile?.location && !placeTouched && (
                  <p className="mb-2 text-xs text-amber-700">
                    "{profile.location}" isn't verified yet. Pick it below so shops nearby can find your jobs.
                  </p>
                )}
                <LocationPicker
                  value={place}
                  onChange={(p) => { setPlace(p); setPlaceTouched(true); setSaved(false); }}
                  confirmLabel="Yes, this is my home port"
                />
              </>
            )}
          </section>
        )}

        {/* Save */}
        {!cropSrc && (
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
