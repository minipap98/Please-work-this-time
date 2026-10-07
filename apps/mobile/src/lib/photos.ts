import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { PhotoInput } from "@bosun/shared/marketplace/photos";

/** Same policy as the web uploader: shrink to a sensible width and JPEG-compress. */
export const MAX_WIDTH = 1600;
export const JPEG_QUALITY = 0.8;

export interface PickedPhoto {
  /** Local file URI for previews. */
  uri: string;
  width: number;
  height: number;
}

export async function pickFromLibrary(limit = 6): Promise<PickedPhoto[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: limit, quality: 1 });
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

export async function takePhoto(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

/** Resize + compress, then read the bytes the shared uploader wants. */
export async function preparePhoto(photo: PickedPhoto): Promise<PhotoInput> {
  const ctx = ImageManipulator.manipulate(photo.uri);
  if (photo.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  const bytes = new Uint8Array(await (await fetch(out.uri)).arrayBuffer());
  return { bytes, contentType: "image/jpeg" };
}
