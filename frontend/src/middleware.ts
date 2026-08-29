import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware — Server-side route protection.
 *
 * This runs on the Edge runtime before the page renders.
 * It checks for the presence of the auth cookie and redirects
 * unauthenticated users away from protected routes.
 *
 * Note: This is a first-line check. The backend authenticate
 * middleware performs full JWT verification + DB validation.
 */

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/leads", "/accounts", "/contacts", "/opportunities", "/activities", "/tasks", "/products", "/campaigns", "/reports", "/automation", "/data-sources", "/integrations", "/onboarding", "/settings", "/admin"];

// Routes that are public (no auth needed)
const publicRoutes = ["/", "/login", "/signup", "/payment", "/checkout", "/super-admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const token = request.cookies.get("token")?.value;

  if (!token) {
    // No token — redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists — let the page render.
  // Backend authenticate middleware will verify the JWT is valid.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
