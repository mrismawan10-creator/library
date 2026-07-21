import { NextResponse } from "next/server";
import { tagNameSchema, uuidSchema } from "@/lib/schemas";
import { deleteTag, renameTag } from "@/lib/data/tags";
import { NotFoundError } from "@/lib/data/errors";
import { handleApiError, readJson } from "@/lib/api/response";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

const renameSchema = z.object({ name: tagNameSchema });

/** PATCH /api/tags/:id — rename (FR-10). Uniqueness stays case-insensitive. */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Tag not found.");
    }
    const { name } = renameSchema.parse(await readJson(request));
    const tag = await renameTag(id, name);
    return NextResponse.json({ tag });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/tags/:id — removes the tag and its links, never a prompt. */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Tag not found.");
    }
    await deleteTag(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
