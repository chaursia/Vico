import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/api/auth/signup",
  "/api/auth/login",
  "/api/subscription/webhook",
  "/api/health",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all non-API routes (admin UI, Next.js internals)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Require Bearer token on all other API routes
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  // Maintenance mode check (skip for admin routes)
  // Full verification happens inside each route handler via verifyAuth()
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
