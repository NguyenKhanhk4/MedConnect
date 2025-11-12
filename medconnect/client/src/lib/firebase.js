import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
};
console.log("FB client project:", import.meta.env.VITE_FB_PROJECT_ID);
console.log(
  "FB apiKey starts:",
  (import.meta.env.VITE_FB_API_KEY || "").slice(0, 8)
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, indexedDBLocalPersistence);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
export async function logout() {
  await signOut(auth);
}

// Clear all Firebase auth data completely
export async function clearAuthData() {
  try {
    // Sign out first
    await signOut(auth);
    
    // Clear any cached data
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB for Firebase
      if ('indexedDB' in window) {
        try {
          const deleteReq = indexedDB.deleteDatabase('firebaseLocalStorageDb');
          deleteReq.onsuccess = () => console.log('IndexedDB cleared');
          deleteReq.onerror = () => console.log('Error clearing IndexedDB');
        } catch (e) {
          console.log('IndexedDB not available');
        }
      }
    }
    
    console.log('All auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}
