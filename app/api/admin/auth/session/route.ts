import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getAdminSecret(): string | null {
  if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.trim()) {
    return process.env.ADMIN_SECRET.trim();
  }
  if (process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD_HASH.trim()) {
    return process.env.ADMIN_PASSWORD_HASH.trim();
  }
  if (process.env.ADMIN_PASSWORD) {
    return hashPassword(process.env.ADMIN_PASSWORD);
  }
  return null;
}

export async function GET() {
  try {
    const expectedAdminId = process.env.ADMIN_ID?.trim() || null;
    const secret = getAdminSecret();

    if (!expectedAdminId || !secret) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("staytrack_admin_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const parts = token.split(":");
    if (parts.length !== 3) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const [adminId, timestampStr, hmac] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // 24-hour expiration check
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ authenticated: false, error: "Session expired" }, { status: 401 });
    }

    if (adminId.toLowerCase() !== expectedAdminId.toLowerCase()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${expectedAdminId}:${timestampStr}`)
      .digest("hex");

    if (hmac !== expectedHmac) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, adminId, adminToken: token });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
