import { NextResponse } from "next/server";
import { categoryUpdateSchema, uuidSchema } from "@/lib/schemas";
import { deleteCategory, updateCategory } from "@/lib/data/categories";
import { NotFoundError } from "@/lib/data/errors";
import { handleApiError, readJson } from "@/lib/api/response";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/categories/:id — rename, describe, or hide from home (FR-09). */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Category not found.");
    }
    const input = categoryUpdateSchema.parse(await readJson(request));
    const category = await updateCategory(id, input);
    return NextResponse.json({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/:id (FR-09).
 *
 * Prompts are never deleted with a category. The foreign key is
 * `on delete set null`, so they become uncategorized instead.
 */
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundError("Category not found.");
    }
    await deleteCategory(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
