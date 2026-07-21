import "server-only";

/**
 * Errors the data layer raises. Route handlers map these to status codes, so
 * the callers never need to know about Postgres error codes.
 */

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict.") {
    super(message);
    this.name = "ConflictError";
  }
}

export class DataError extends Error {
  constructor(message = "Database request failed.") {
    super(message);
    this.name = "DataError";
  }
}

type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
};

/**
 * Translates a PostgREST error into ours. The original message is deliberately
 * dropped for anything unrecognised: it can name columns, constraints, and
 * connection details that must not reach the client.
 */
export function toDataError(error: PostgrestErrorLike): Error {
  switch (error.code) {
    case "PGRST116": // no rows returned by .single()
      return new NotFoundError();
    case "23505": // unique_violation
      return new ConflictError("That value is already taken.");
    case "23514": // check_violation
      return new ConflictError("That change is not allowed.");
    case "23503": // foreign_key_violation
      return new ConflictError("A referenced record does not exist.");
    default:
      console.error("[data]", error.code, error.message, error.details);
      return new DataError();
  }
}
