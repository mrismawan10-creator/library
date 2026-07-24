import "server-only";

/**
 * Server-side upload validation (FR-08, security rule 3).
 *
 * The client sends a filename and a Content-Type, and neither can be trusted: a
 * text file renamed to cover.jpg arrives with a .jpg name and an image/jpeg
 * header. So the type is decided from the bytes themselves, and sharp later
 * fails to decode anything that lied its way past this. Extension and
 * Content-Type are ignored entirely.
 */

import { MAX_UPLOAD_BYTES } from "./constants";

export type DetectedImage = "jpeg" | "png" | "webp";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Reads the magic bytes. Returns null when nothing recognised matches. */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

/**
 * Validates a raw upload buffer. Throws UploadValidationError with a message
 * safe to show the user; the route maps it to a 422.
 */
export function validateImageUpload(buffer: Buffer): DetectedImage {
  if (buffer.length === 0) {
    throw new UploadValidationError("The file is empty.");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("The image must be 10 MB or smaller.");
  }

  const type = detectImageType(buffer);
  if (!type) {
    throw new UploadValidationError(
      "That file is not a supported image. Use JPG, PNG, or WebP.",
    );
  }

  return type;
}
