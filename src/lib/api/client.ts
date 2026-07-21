/**
 * Browser-side helper for calling the app's own API.
 *
 * Every route handler answers with the same error envelope, so this unwraps it
 * once and gives callers a typed error carrying any field-level messages.
 */

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A non-JSON body only matters when the request also failed.
  }

  if (!response.ok) {
    const envelope = body as
      | { error?: { message?: string; fields?: Record<string, string> } }
      | null;
    throw new ApiError(
      envelope?.error?.message ?? "Request failed.",
      response.status,
      envelope?.error?.fields,
    );
  }

  return body as T;
}
