import { NextResponse } from "next/server";
import { imageStyleSchema } from "@/lib/ai/image-to-prompt";
import { imageToPrompt } from "@/lib/ai/image-to-prompt";
import { isAiConfigured } from "@/lib/ai/client";
import {
  validateImageUpload,
  UploadValidationError,
} from "@/lib/media/validate";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { handleApiError, jsonError } from "@/lib/api/response";

/**
 * POST /api/image-to-prompt — turn an uploaded image into a prompt.
 *
 * multipart/form-data: `file` (the image) and `style` ("detailed" | "concise").
 * The image is validated by magic bytes (same gate as covers), never persisted
 * here, and sent to the vision model as a base64 data URL.
 */
export async function POST(request: Request) {
  try {
    if (!isAiConfigured()) {
      return jsonError(
        "AI is not configured on the server. Set AI_API_KEY to use image-to-prompt.",
        503,
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("No image was provided.", 422, {
        file: "Choose an image.",
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError("The image must be 10 MB or smaller.", 422, {
        file: "The image must be 10 MB or smaller.",
      });
    }

    const style = imageStyleSchema.catch("detailed").parse(form.get("style"));

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = validateImageUpload(buffer); // throws on non-image
    const dataUrl = `data:image/${detected};base64,${buffer.toString("base64")}`;

    const prompt = await imageToPrompt(dataUrl, style);
    return NextResponse.json({ prompt });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return jsonError(error.message, 422, { file: error.message });
    }
    return handleApiError(error);
  }
}

export const maxDuration = 120;
