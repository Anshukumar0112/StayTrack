import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const DEFAULT_ADMIN_ID = "admin";
const DEFAULT_ADMIN_PASS = "admin123";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function GET() {
  try {
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

    const expectedAdminId = process.env.ADMIN_ID || DEFAULT_ADMIN_ID;
    const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASS;

    if (adminId.toLowerCase() !== expectedAdminId.toLowerCase()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const secret = process.env.ADMIN_SECRET || expectedPasswordHash || hashPassword(expectedPassword);
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${expectedAdminId}:${timestampStr}`)
      .digest("hex");

    if (hmac !== expectedHmac) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, adminId });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
