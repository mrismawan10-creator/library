import { NextResponse } from "next/server";
import { listCategories } from "@/lib/data/categories";
import { handleApiError } from "@/lib/api/response";

/** GET /api/categories — feeds the category select on the prompt form. */
export async function GET() {
  try {
    const categories = await listCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}
