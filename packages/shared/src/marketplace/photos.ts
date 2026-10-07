import type { Db } from "../db/client";

/**
 * A job photo to upload: an http(s) URL that's already hosted (kept as is), a data: URL
 * (the web's file reader output), or raw bytes (the mobile app's resized JPEG).
 */
export type PhotoInput = string | { bytes: Uint8Array; contentType: string };

/** Decode a data: URL into bytes + MIME type. `atob` exists in browsers, Node and Hermes. */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const [header, data] = dataUrl.split(",");
  const contentType = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

export function photoExtension(contentType: string): string {
  return contentType.split("/")[1] || "jpg";
}

/**
 * Upload a job's photos to the public `project-photos` bucket under `<uid>/<projectId>/<i>.<ext>`
 * and record each one in `project_photos`. Returns the public URLs in order.
 */
export async function uploadProjectPhotos(
  client: Db,
  userId: string,
  projectId: string,
  photos: PhotoInput[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (!photo) continue;
    let file: { bytes: Uint8Array; contentType: string };
    if (typeof photo === "string") {
      if (photo.startsWith("http")) {
        urls.push(photo);
        continue;
      }
      if (!photo.startsWith("data:image/")) continue;
      file = dataUrlToBytes(photo);
    } else {
      file = photo;
    }
    const path = `${userId}/${projectId}/${i}.${photoExtension(file.contentType)}`;
    const { error } = await client.storage.from("project-photos").upload(path, file.bytes, {
      contentType: file.contentType,
      upsert: true,
    });
    if (error) throw error;
    const { data } = client.storage.from("project-photos").getPublicUrl(path);
    urls.push(data.publicUrl);
    await client.from("project_photos").insert({
      project_id: projectId,
      url: data.publicUrl,
      sort_order: i,
    });
  }
  return urls;
}
