import {
  ConfirmationResult,
  RecaptchaVerifier,
  User as FirebaseUser,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier(): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA can only be initialized in the browser.");
  }

  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  const container = document.getElementById("recaptcha-container");

  if (!container) {
    throw new Error("reCAPTCHA container was not found.");
  }

  recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA verified");
      },
    }
  );

  return recaptchaVerifier;
}

export async function sendOtp(
  phoneNumber: string
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier();

  try {
    return await signInWithPhoneNumber(
      auth,
      phoneNumber,
      verifier
    );
  } catch (error) {
    resetRecaptcha();
    throw error;
  }
}

export async function verifyOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<FirebaseUser> {
  const result = await confirmationResult.confirm(otp);

  resetRecaptcha();

  return result.user;
}

export async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken();
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

export function resetRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore clear errors
    }
    recaptchaVerifier = null;
  }
}