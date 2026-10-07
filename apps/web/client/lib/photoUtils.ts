// ── Photo resize + localStorage helpers for project job photos ──

/**
 * Resize an image file to a max width and compress as JPEG data URL.
 * Keeps aspect ratio. Returns a base64 data URL string.
 */
export function resizePhoto(
  file: File,
  maxWidth = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxWidth) {
          h = Math.round(h * (maxWidth / w));
          w = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function storageKey(projectId: string) {
  return `project_photos_${projectId}`;
}

export function getProjectPhotos(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addProjectPhoto(projectId: string, dataUrl: string): void {
  const photos = getProjectPhotos(projectId);
  photos.push(dataUrl);
  localStorage.setItem(storageKey(projectId), JSON.stringify(photos));
}

export function removeProjectPhoto(projectId: string, index: number): void {
  const photos = getProjectPhotos(projectId);
  photos.splice(index, 1);
  localStorage.setItem(storageKey(projectId), JSON.stringify(photos));
}
