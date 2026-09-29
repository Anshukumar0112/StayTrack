import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const loginRedirect = () => {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  };

  const expectedAdminId = process.env.ADMIN_ID || null;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  const devPassword = process.env.ADMIN_PASSWORD || null;

  // Determine HMAC secret (prefer ADMIN_SECRET, then ADMIN_PASSWORD_HASH, then dev ADMIN_PASSWORD)
  let secret = process.env.ADMIN_SECRET?.trim() || expectedPasswordHash;
  if (!secret && devPassword) {
    secret = await sha256(devPassword);
  }

  // If server admin credentials/secret are not configured, block access to /admin/*
  if (!expectedAdminId || !secret) {
    return loginRedirect();
  }

  const token = request.cookies.get("staytrack_admin_session")?.value;

  if (!token) {
    return loginRedirect();
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    return loginRedirect();
  }

  const [adminId, timestampStr, hmac] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Check timestamp expiration (24 hours = 86,400,000 ms)
  if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return loginRedirect();
  }

  if (adminId.toLowerCase() !== expectedAdminId.toLowerCase()) {
    return loginRedirect();
  }

  const expectedHmac = await hmacSha256(secret, `${expectedAdminId}:${timestampStr}`);

  if (hmac !== expectedHmac) {
    return loginRedirect();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
