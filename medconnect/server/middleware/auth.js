import admin from "firebase-admin";
 import { fail } from "../utils/response.js";
import { COOKIE_NAME } from "../constants/index.js";

/**
 * Authentication middleware
 */
export async function authGuard(req, res, next) {
  const cookie = req.cookies[COOKIE_NAME] || "";
  
  console.log("🔍 AuthGuard - Cookie present:", !!cookie);
  
  if (!cookie) {
    console.log("❌ No session cookie found");
    return fail(res, 401, "UNAUTHORIZED", "No session cookie found");
  }
  
  try {
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    console.log("🔍 AuthGuard - Decoded token:", { uid: decoded.uid, email: decoded.email, app_user_id: decoded.app_user_id, customClaims: decoded });
    
    // Email should be in custom claims from login
    if (!decoded.email && decoded.uid) {
      try {
        console.log("🔍 AuthGuard - Getting user from Firebase Admin for uid:", decoded.uid);
        const userRecord = await admin.auth().getUser(decoded.uid);
        decoded.email = userRecord.email;
        decoded.displayName = userRecord.displayName;
        console.log("🔍 AuthGuard - Retrieved email from Firebase Admin:", decoded.email);
      } catch (adminError) {
        console.error("❌ Failed to get user from Firebase Admin:", adminError);
      }
    }
    
    // Ensure app_user_id is available for doctor functions (optional for now)
    if (!decoded.app_user_id && decoded.uid) {
      console.log("⚠️ No app_user_id found in decoded token, but continuing with uid");
      // Don't fail here, just log a warning
    }
    
    console.log("🔍 AuthGuard - Final user object:", { uid: decoded.uid, email: decoded.email, app_user_id: decoded.app_user_id });
    req.user = decoded;
    next();
  } catch (e) {
    console.error("❌ authGuard error:", e);
    return fail(res, 401, "UNAUTHORIZED", e.message || String(e));
  }
}
