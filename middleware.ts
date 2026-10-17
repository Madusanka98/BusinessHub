import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static files, Next internals, and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.includes(".") // images, icons, robots.txt, etc.
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("bh_session")?.value;
  const isPublicPath =
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/invite/");

  // 2. Redirect unauthenticated users attempting to access protected routes
  if (!isPublicPath && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Redirect authenticated users away from login/auth pages to main application
  if (isPublicPath && sessionToken && (pathname === "/login" || pathname === "/forgot-password")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Attach defense-in-depth security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
