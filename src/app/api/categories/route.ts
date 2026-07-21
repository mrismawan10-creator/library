import { NextResponse } from "next/server";
import { categoryCreateSchema } from "@/lib/schemas";
import { createCategory, listCategories } from "@/lib/data/categories";
import { handleApiError, readJson } from "@/lib/api/response";

/** GET /api/categories — feeds the prompt form and the filter panel. */
export async function GET() {
  try {
    const categories = await listCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/categories — create (FR-09). */
export async function POST(request: Request) {
  try {
    const input = categoryCreateSchema.parse(await readJson(request));
    const category = await createCategory(input);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
