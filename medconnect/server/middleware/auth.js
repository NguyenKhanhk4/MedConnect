import admin from "firebase-admin";
 import { fail } from "../utils/response.js";
import { COOKIE_NAME } from "../constants/index.js";

/**
 * Authentication middleware - requires authentication
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

/**
 * Optional authentication middleware - sets req.user if authenticated, but doesn't fail if not
 */
export async function optionalAuth(req, res, next) {
  const cookie = req.cookies[COOKIE_NAME] || "";
  
  console.log("🔍 OptionalAuth - Cookie present:", !!cookie, "Cookie name:", COOKIE_NAME);
  console.log("🔍 OptionalAuth - All cookies:", Object.keys(req.cookies || {}));
  
  if (!cookie) {
    console.log("🔍 OptionalAuth - No cookie found, setting req.user = null");
    req.user = null;
    return next();
  }
  
  try {
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    
    // Email should be in custom claims from login
    if (!decoded.email && decoded.uid) {
      try {
        const userRecord = await admin.auth().getUser(decoded.uid);
        decoded.email = userRecord.email;
        decoded.displayName = userRecord.displayName;
      } catch (adminError) {
        console.error("❌ Failed to get user from Firebase Admin:", adminError);
        // If user doesn't exist in Firebase, treat as not authenticated
        req.user = null;
        return next();
      }
    }
    
    // Double-check: Verify user still exists in Firebase
    try {
      await admin.auth().getUser(decoded.uid);
      req.user = decoded;
      console.log("🔍 OptionalAuth - User authenticated:", { uid: decoded.uid, email: decoded.email });
    } catch (userCheckError) {
      // User doesn't exist in Firebase anymore, treat as not authenticated
      console.log("🔍 OptionalAuth - User no longer exists in Firebase, setting req.user = null");
      req.user = null;
    }
  } catch (e) {
    // If verification fails, just set user to null and continue
    console.log("🔍 OptionalAuth - Cookie verification failed:", e.message);
    req.user = null;
  }
  
  next();
}
