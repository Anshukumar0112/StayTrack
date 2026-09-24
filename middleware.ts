import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_ADMIN_ID = "admin";
const DEFAULT_ADMIN_PASS = "admin123";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (exclude /admin/login and /api/admin/auth/*)
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("staytrack_admin_session")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const [adminId, timestampStr, hmac] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Check timestamp expiration (24 hours)
  if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const expectedAdminId = process.env.ADMIN_ID || DEFAULT_ADMIN_ID;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASS;

  if (adminId.toLowerCase() !== expectedAdminId.toLowerCase()) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const secret = process.env.ADMIN_SECRET || expectedPasswordHash || (await sha256(expectedPassword));
  const expectedHmac = await hmacSha256(secret, `${expectedAdminId}:${timestampStr}`);

  if (hmac !== expectedHmac) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
