import { NextRequest, NextResponse } from "next/server";

// Basic-auth gate for the whole dashboard (also covers <video> requests).
export function middleware(req: NextRequest) {
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return NextResponse.next();

  const h = req.headers.get("authorization");
  if (h?.startsWith("Basic ")) {
    try {
      const decoded = atob(h.slice(6));
      if (decoded.slice(decoded.indexOf(":") + 1) === pass) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Media Hub"' },
  });
}

export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
