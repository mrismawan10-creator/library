import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic Auth gate for deployment (PRD §10.3, DoD §18.9).
 *
 * Public deployment without protection is forbidden. This enforces Basic Auth
 * whenever BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set, and is a no-op when
 * they are not — so local development stays open, and a deploy is protected the
 * moment the env vars are present. Set them in production.
 */

function timingSafeEqual(a: string, b: string): boolean {
  // Constant-time within the Edge runtime: always compare the full length so
  // the time taken does not reveal how much of the credential matched.
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i += 1) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // Not configured → open (local development).
  if (!user || !password) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const index = decoded.indexOf(":");
    const givenUser = decoded.slice(0, index);
    const givenPass = decoded.slice(index + 1);

    // Evaluate both comparisons regardless, so a correct username is not faster.
    const userOk = timingSafeEqual(givenUser, user);
    const passOk = timingSafeEqual(givenPass, password);
    if (userOk && passOk) return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Prompt Library", charset="UTF-8"' },
  });
}

export const config = {
  // Guard everything except Next's internal assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
