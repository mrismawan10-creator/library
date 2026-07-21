import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConflictError, DataError, NotFoundError } from "@/lib/data/errors";

/**
 * One response shape for every route handler, so the client can render errors
 * without knowing which endpoint produced them:
 *
 *   { error: { message: string, fields?: Record<string, string> } }
 *
 * `fields` maps a form field name to its message, which is what the create and
 * edit forms bind to their inputs. Responses never carry secrets, stack traces,
 * or raw database messages (PRD §10).
 */

export type ApiErrorBody = {
  error: {
    message: string;
    fields?: Record<string, string>;
  };
};

export function jsonError(
  message: string,
  status: number,
  fields?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { message, fields } }, { status });
}

/** Flattens a ZodError into field -> first message. */
function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Maps a thrown error to a response. Anything unrecognised becomes a generic
 * 500: the real error is logged on the server and never described to the
 * client.
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return jsonError("Please check the highlighted fields.", 422, fieldErrors(error));
  }
  if (error instanceof SyntaxError) {
    return jsonError("Malformed request body.", 400);
  }
  if (error instanceof NotFoundError) {
    return jsonError(error.message, 404);
  }
  if (error instanceof ConflictError) {
    return jsonError(error.message, 409);
  }
  if (error instanceof DataError) {
    return jsonError(error.message, 500);
  }

  console.error("[api]", error);
  return jsonError("Something went wrong.", 500);
}

/** Parses a JSON body, turning malformed input into a clean 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("invalid json");
  }
}
