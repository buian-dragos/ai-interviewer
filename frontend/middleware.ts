import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_ROUTES = ["/home"];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthenticated(request);

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!authed) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (AUTH_ROUTES.includes(pathname) && authed) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/login", "/signup"],
};
