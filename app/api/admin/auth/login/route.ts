import { NextResponse } from "next/server";
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
    // Temporary development-only fallback (ADMIN_PASSWORD_HASH preferred in production)
    return hashPassword(process.env.ADMIN_PASSWORD);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminId, password, isGoogleAuth, idToken: bodyToken } = body || {};

    const expectedAdminId = process.env.ADMIN_ID?.trim() || null;
    const secret = getAdminSecret();

    if (!expectedAdminId || !secret) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin authentication is not configured on this server. Please set ADMIN_ID and ADMIN_PASSWORD_HASH or ADMIN_SECRET.",
        },
        { status: 500 }
      );
    }

    // Handle Google Admin SSO with mandatory Server-Side Firebase ID Token Verification
    if (isGoogleAuth) {
      // Extract Bearer token from header or request body
      const authHeader = request.headers.get("authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
      const firebaseToken = bearerToken || bodyToken;

      if (!firebaseToken) {
        return NextResponse.json(
          { success: false, error: "Firebase authentication token is required for Google Admin SSO." },
          { status: 401 }
        );
      }

      // Verify the authenticated user against backend user profile endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      try {
        const verifyRes = await fetch(`${backendUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!verifyRes.ok) {
          return NextResponse.json(
            { success: false, error: "Access Denied: Unable to verify Google account credentials." },
            { status: 401 }
          );
        }

        const userProfile = await verifyRes.json();
        if (!userProfile || userProfile.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Access Denied: This account is not authorized as an Admin in StayTrack." },
            { status: 401 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Admin role verification service unreachable." },
          { status: 500 }
        );
      }

      // Issue admin session cookie for verified admin user
      const timestamp = Date.now();
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(`${expectedAdminId}:${timestamp}`)
        .digest("hex");

      const token = `${expectedAdminId}:${timestamp}:${hmac}`;

      const response = NextResponse.json({
        success: true,
        message: "Google Admin authentication verified successfully.",
        adminToken: token,
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
    }

    // Handle Standard Admin ID + Password Credential Login
    if (!adminId || !password) {
      return NextResponse.json(
        { success: false, error: "Admin ID and Password are required." },
        { status: 400 }
      );
    }

    const idMatches = adminId.trim().toLowerCase() === expectedAdminId.toLowerCase();

    let passwordMatches = false;
    if (process.env.ADMIN_PASSWORD_HASH) {
      passwordMatches = hashPassword(password) === process.env.ADMIN_PASSWORD_HASH.trim();
    } else if (process.env.ADMIN_PASSWORD) {
      passwordMatches = password === process.env.ADMIN_PASSWORD;
    }

    if (!idMatches || !passwordMatches) {
      return NextResponse.json(
        { success: false, error: "Invalid Admin ID or Password." },
        { status: 401 }
      );
    }

    const timestamp = Date.now();
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(`${expectedAdminId}:${timestamp}`)
      .digest("hex");

    const token = `${expectedAdminId}:${timestamp}:${hmac}`;

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
      adminToken: token,
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
