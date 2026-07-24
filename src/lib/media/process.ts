import "server-only";

import sharp from "sharp";
import { UploadValidationError } from "./validate";

/**
 * Cover processing with sharp (FR-08, PRD §8).
 *
 * Every cover is 2:3. The server generates a poster and a thumbnail as WebP —
 * Supabase image transformation is deliberately not used. Two things happen for
 * free and matter for security: `.rotate()` bakes in EXIF orientation, and not
 * copying metadata afterwards drops all EXIF (location, device, timestamps).
 */

// 2:3 at two sizes. Poster drives the hero and detail; thumbnail drives cards.
const POSTER = { width: 600, height: 900 };
const THUMBNAIL = { width: 300, height: 450 };

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProcessedCover = {
  poster: Buffer;
  thumbnail: Buffer;
};

/**
 * Turns a validated upload into a poster and a thumbnail.
 *
 * When a crop rectangle is given (pixels in the source image), it is applied
 * before resizing; otherwise the image is cover-fitted to 2:3, centred. Either
 * way the output is exactly 2:3, so nothing downstream can be distorted.
 */
export async function processCover(
  input: Buffer,
  crop?: CropRect,
): Promise<ProcessedCover> {
  try {
    const base = sharp(input, { failOn: "error" }).rotate(); // apply + strip EXIF

    let prepared = base;
    if (crop && crop.width > 0 && crop.height > 0) {
      const meta = await sharp(input).rotate().metadata();
      const maxW = meta.width ?? crop.x + crop.width;
      const maxH = meta.height ?? crop.y + crop.height;

      // Clamp so a rounding error from the client cannot exceed the image.
      const left = Math.max(0, Math.min(Math.round(crop.x), maxW - 1));
      const top = Math.max(0, Math.min(Math.round(crop.y), maxH - 1));
      const width = Math.max(1, Math.min(Math.round(crop.width), maxW - left));
      const height = Math.max(1, Math.min(Math.round(crop.height), maxH - top));

      prepared = base.extract({ left, top, width, height });
    }

    const toWebp = (buffer: Buffer, size: { width: number; height: number }) =>
      sharp(buffer)
        .resize(size.width, size.height, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toBuffer();

    // Normalise to the poster first, then derive the thumbnail from it so both
    // frame the image identically.
    const posterSource = await prepared.webp({ quality: 90 }).toBuffer();
    const [poster, thumbnail] = await Promise.all([
      toWebp(posterSource, POSTER),
      toWebp(posterSource, THUMBNAIL),
    ]);

    return { poster, thumbnail };
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    // sharp refused to decode it — it was not a real image after all.
    throw new UploadValidationError(
      "That image could not be processed. Try a different file.",
    );
  }
}
