import { NextResponse } from "next/server";
import crypto from "crypto";

const DEFAULT_ADMIN_ID = "admin";
const DEFAULT_ADMIN_PASS = "admin123";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, password } = body || {};

    if (!adminId || !password) {
      return NextResponse.json(
        { success: false, error: "Admin ID and password are required." },
        { status: 400 }
      );
    }

    const expectedAdminId = process.env.ADMIN_ID || DEFAULT_ADMIN_ID;
    const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const expectedPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASS;

    const idMatches = adminId.trim().toLowerCase() === expectedAdminId.trim().toLowerCase();

    let passwordMatches = false;
    if (expectedPasswordHash) {
      passwordMatches = hashPassword(password) === expectedPasswordHash.trim();
    } else {
      passwordMatches = password === expectedPassword;
    }

    if (!idMatches || !passwordMatches) {
      return NextResponse.json(
        { success: false, error: "Invalid Admin ID or Password." },
        { status: 401 }
      );
    }

    const secret = process.env.ADMIN_SECRET || expectedPasswordHash || hashPassword(expectedPassword);
    const timestamp = Date.now();
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(`${expectedAdminId}:${timestamp}`)
      .digest("hex");

    const token = `${expectedAdminId}:${timestamp}:${hmac}`;

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
    });

    response.cookies.set({
      name: "staytrack_admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
