import { NextResponse } from "next/server";
import { z } from "zod";
import { uuidSchema } from "@/lib/schemas";
import { NotFoundError } from "@/lib/data/errors";
import { removeCover, setUploadedCover } from "@/lib/data/cover";
import { UploadValidationError } from "@/lib/media/validate";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { handleApiError, jsonError } from "@/lib/api/response";

type Context = { params: Promise<{ id: string }> };

const cropSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

/**
 * POST /api/prompts/:id/cover — upload a cover (FR-08).
 *
 * multipart/form-data: `file` (the image) and optional `crop` (JSON pixel
 * rectangle in the source image). Validation is server-side and byte-based.
 */
export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Prompt not found.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("No image file was provided.", 422, {
        file: "Choose an image to upload.",
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError("The image must be 10 MB or smaller.", 422, {
        file: "The image must be 10 MB or smaller.",
      });
    }

    let crop;
    const rawCrop = form.get("crop");
    if (typeof rawCrop === "string" && rawCrop.length > 0) {
      const parsed = cropSchema.safeParse(JSON.parse(rawCrop));
      if (parsed.success) crop = parsed.data;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const prompt = await setUploadedCover(id, buffer, crop);
    return NextResponse.json({ prompt });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return jsonError(error.message, 422, { file: error.message });
    }
    return handleApiError(error);
  }
}

/** DELETE /api/prompts/:id/cover — remove the custom cover (FR-08). */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Prompt not found.");
    }
    const prompt = await removeCover(id);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error);
  }
}
