/**
 * Local image helpers shared by the image tools. Files are read and decoded
 * in the browser; nothing is uploaded. Limits keep large images from
 * exhausting memory or failing silently on phones.
 */

import { formatBytes } from "@/lib/format";

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** Decoded size limit: a 40-megapixel image already needs about 160 MB of memory. */
export const MAX_IMAGE_PIXELS = 40_000_000;
export const RASTER_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"];

export type LoadedImage = { bitmap: ImageBitmap; width: number; height: number; name: string; type: string; bytes: number };

export type ImageCheck = { ok: true } | { ok: false; error: string };

/** Checks a file before decoding it. Pure, so it can be unit-tested. */
export function checkImageFile({ size, type, name }: { size: number; type: string; name: string }): ImageCheck {
  if (size === 0) return { ok: false, error: `${name} is empty.` };
  if (size > MAX_IMAGE_BYTES) return { ok: false, error: `${name} is ${formatBytes(size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.` };
  if (type && !RASTER_TYPES.includes(type)) return { ok: false, error: `${name} is ${type}, which is not supported here. Use PNG, JPEG, WebP, GIF, AVIF or BMP.` };
  return { ok: true };
}

export function checkDimensions(width: number, height: number): ImageCheck {
  if (!(width > 0 && height > 0)) return { ok: false, error: "The image has no size." };
  if (width * height > MAX_IMAGE_PIXELS) return { ok: false, error: `The image is ${width}×${height} pixels (${((width * height) / 1e6).toFixed(1)} megapixels). The limit is ${MAX_IMAGE_PIXELS / 1e6} megapixels.` };
  return { ok: true };
}

export type LoadResult = { ok: true; image: LoadedImage } | { ok: false; error: string };

/** Decodes a local image file with createImageBitmap. Browser only. */
export async function loadImageFile(file: File): Promise<LoadResult> {
  const check = checkImageFile(file);
  if (!check.ok) return check;
  if (typeof createImageBitmap !== "function") return { ok: false, error: "This browser cannot decode images here (createImageBitmap is missing)." };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: `${file.name} could not be decoded. The file may be damaged or in a format this browser does not support.` };
  }
  const dims = checkDimensions(bitmap.width, bitmap.height);
  if (!dims.ok) {
    bitmap.close();
    return dims;
  }
  return { ok: true, image: { bitmap, width: bitmap.width, height: bitmap.height, name: file.name, type: file.type, bytes: file.size } };
}

/** The first image file in a paste or drop, if any. */
export function imageFromTransfer(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const file of Array.from(data.files)) if (file.type.startsWith("image/")) return file;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

/** A canvas of the given size and its 2D context, or an error message. */
export function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | { error: string } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // Browsers return null (or a context that draws nothing) when a canvas is too large for the device.
  if (!ctx || canvas.width !== width || canvas.height !== height) return { error: `This browser cannot create a ${width}×${height} canvas. Try a smaller size.` };
  return { canvas, ctx };
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
