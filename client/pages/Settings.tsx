import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Header from "@/components/Header";

const STORAGE_KEY = "hero_image";
const ASPECT = 2 / 1; // 2:1 landscape, matches the hero display
const DEFAULT_IMAGE = "https://cdn.builder.io/api/v1/image/assets%2F6d21a31dd9f5464480f247d960742b01%2Fbc990cddf7ea4c13b79484a350ac1943?format=webp&width=1400&height=700";

function centerAspectCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 100 }, ASPECT, width, height),
    width,
    height,
  );
}

function getCroppedDataUrl(image: HTMLImageElement, crop: PixelCrop): string {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
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

  // Saved preview (what's committed to localStorage)
  const [preview, setPreview] = useState<string>(
    localStorage.getItem(STORAGE_KEY) ?? DEFAULT_IMAGE
  );

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null); // raw uploaded image
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [location, setLocation] = useState<string>(
    localStorage.getItem("user_location") ?? ""
  );
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
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight));
  }, []);

  function handleApplyCrop() {
    if (!imgRef.current || !completedCrop) return;
    const dataUrl = getCroppedDataUrl(imgRef.current, completedCrop);
    setPreview(dataUrl);
    setCropSrc(null);
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, preview);
    localStorage.setItem("user_location", location);
    setSaved(true);
    setTimeout(() => navigate("/"), 700);
  }

  function handleReset() {
    setPreview(DEFAULT_IMAGE);
    setCropSrc(null);
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

        <h1 className="text-2xl font-semibold text-foreground mb-8">Settings</h1>

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
                Drag to reposition the crop area, then click <strong>Apply Crop</strong>.
              </p>
              <div className="rounded-md overflow-hidden bg-gray-900 flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={ASPECT}
                  minWidth={100}
                >
                  <img
                    ref={imgRef}
                    src={cropSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-h-96 object-contain"
                  />
                </ReactCrop>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApplyCrop}
                  disabled={!completedCrop}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply Crop
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
              <div className="w-full h-52 rounded-md overflow-hidden bg-gray-100 mb-4">
                <img
                  src={preview}
                  alt="Hero preview"
                  className="w-full h-full object-cover"
                />
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
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setSaved(false); }}
              placeholder="e.g. Miami, FL · Biscayne Bay Marina"
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
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
              className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
