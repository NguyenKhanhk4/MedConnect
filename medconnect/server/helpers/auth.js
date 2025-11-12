import argon2 from "argon2";
import bcrypt from "bcrypt";

export function toE164(phone, country = "+84") {
  const raw = String(phone || "").replace(/\D/g, "");
  if (!raw) return "";
  
  if (raw.length === 10 && raw.startsWith("0")) {
    return country + raw.slice(1); 
  }
  
  if (raw.startsWith("84") && raw.length === 11) {
    return "+" + raw; 
  }
  
  return "";
}


export async function verifyPassword(hash, plain) {
  if (!hash || !plain) return false;
  try {
    if (hash.startsWith("$argon2")) {
      return await argon2.verify(hash, plain);
    }
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(plain, hash);
    }
    return false;
  } catch {
    return false;
  }
}


export async function hashPassword(plain) {
  if (!plain) return null;
  try {
    // Use argon2 for new passwords
    return await argon2.hash(plain);
  } catch (e) {
    console.error("❌ Password hashing error:", e);
    throw new Error("Failed to hash password");
  }
}
