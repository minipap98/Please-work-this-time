import { useState, useRef } from "react";
import { uploadProjectPhoto } from "@/hooks/use-supabase";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

interface PhotoUploadProps {
  projectId: string;
  existingPhotos?: { id: string; url: string; caption: string | null }[];
  onPhotosChanged?: () => void;
}

export default function PhotoUpload({ projectId, existingPhotos = [], onPhotosChanged }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(existingPhotos);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) continue; // 10MB max

        const url = await uploadProjectPhoto(projectId, file);

        // Insert into project_photos table
        const { data } = await supabase
          .from("project_photos")
          .insert({ project_id: projectId, url, sort_order: photos.length })
          .select()
          .single();

        const photo = data as Tables<"project_photos"> | null;
        if (photo) {
          setPhotos((prev) => [...prev, { id: photo.id, url: photo.url, caption: null }]);
        }
      }
      onPhotosChanged?.();
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete(photoId: string, url: string) {
    const path = url.split("/project-photos/")[1];
    if (path) {
      await supabase.storage.from("project-photos").remove([decodeURIComponent(path)]);
    }
    await supabase.from("project_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    onPhotosChanged?.();
  }

  return (
    <div>
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(photo.id, photo.url)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border border-dashed border-border rounded-lg p-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add Photos
          </>
        )}
      </button>
    </div>
  );
}
