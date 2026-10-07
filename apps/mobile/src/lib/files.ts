// Picking an invoice: a PDF from Files, a photo from the library, or a fresh camera shot.
// Photos are shrunk to 2000px JPEGs like the web's uploader; PDFs go up as they are.
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { MAX_INVOICE_BYTES } from "@bosun/shared/boatLog/invoiceRead";
import { pickFromLibrary, takePhoto } from "./photos";

export interface PickedFile {
  /** Local URI for a preview (images only). */
  uri: string;
  isPdf: boolean;
  bytes: Uint8Array;
}

async function read(uri: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  if (bytes.byteLength > MAX_INVOICE_BYTES) throw new Error("That file is over 15 MB. Try a smaller scan or a photo.");
  return bytes;
}

/** Re-encode as JPEG (quality 0.85), shrinking to 2000px wide when the width is known and bigger. */
async function shrink(uri: string, width?: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (width && width > 2000) ctx.resize({ width: 2000 });
  const image = await ctx.renderAsync();
  return (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 })).uri;
}

export async function pickInvoicePdf(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const isPdf = a.mimeType === "application/pdf" || /\.pdf$/i.test(a.name);
  if (isPdf) return { uri: a.uri, isPdf: true, bytes: await read(a.uri) };
  const out = await shrink(a.uri);
  return { uri: out, isPdf: false, bytes: await read(out) };
}

export async function pickInvoicePhoto(fromCamera: boolean): Promise<PickedFile | null> {
  const shot = fromCamera ? await takePhoto() : (await pickFromLibrary(1))[0] ?? null;
  if (!shot) return null;
  const out = await shrink(shot.uri, shot.width);
  return { uri: out, isPdf: false, bytes: await read(out) };
}
