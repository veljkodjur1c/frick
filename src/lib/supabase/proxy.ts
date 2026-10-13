import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/redirect";
import { getSupabaseEnv } from "./env";

// The only page a logged-out user may open. Static files are already skipped by the matcher in src/proxy.ts.
const LOGIN_PATH = "/login";
const HOME_PATH = "/feed";

/**
 * Refreshes the Supabase auth session on every request and writes the new cookies.
 * Server Components can't set cookies, so without this an expired token is never saved.
 *
 * Also the first auth filter: logged out -> /login, logged in on /login -> the app.
 * Pages and Server Actions still check the user themselves (requireUser / getCurrentUser).
 * Used only by src/proxy.ts.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  let sessionHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Update the request so Server Components in this request see the new session,
        // then the response so the browser stores it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // No-cache headers so a CDN never serves one user's session to another.
        sessionHeaders = headers;
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Don't put code between createServerClient and getUser(): getUser() triggers the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const onLogin = pathname === LOGIN_PATH;

  if (!user && !onLogin) {
    const target = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/") {
      target.searchParams.set("next", `${pathname}${search}`);
    }
    return redirectKeepingSession(target, response, sessionHeaders);
  }

  if (user && onLogin) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next")) ?? HOME_PATH;
    return redirectKeepingSession(new URL(next, request.url), response, sessionHeaders);
  }

  return response;
}

/** A redirect that still carries the refreshed session cookies and no-cache headers, or the session is lost. */
function redirectKeepingSession(
  target: URL,
  from: NextResponse,
  headers: Record<string, string>,
): NextResponse {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const [key, value] of Object.entries(headers)) {
    redirect.headers.set(key, value);
  }
  return redirect;
}
