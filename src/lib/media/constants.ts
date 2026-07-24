/**
 * Media constants shared by client and server. No server-only imports here, so
 * the upload UI can reuse the same numbers the validator enforces.
 */

/** Maximum cover upload size (PRD §21.5). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Formats supported for cover upload (FR-08). */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
