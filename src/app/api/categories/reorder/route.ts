import { NextResponse } from "next/server";
import { categoryReorderSchema } from "@/lib/schemas";
import { reorderCategories } from "@/lib/data/categories";
import { handleApiError, readJson } from "@/lib/api/response";

/** PATCH /api/categories/reorder — takes the full ordered list of ids (FR-09). */
export async function PATCH(request: Request) {
  try {
    const { ids } = categoryReorderSchema.parse(await readJson(request));
    const categories = await reorderCategories(ids);
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}
