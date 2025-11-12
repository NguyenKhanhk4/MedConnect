// Utility function to clear all user data and cache
export const clearUserData = async () => {
  try {
    console.log("Clearing all user data...");

    // First, sign out from Firebase (if logged in)
    try {
      const { auth, signOut } = await import("../lib/firebase.js");
      await signOut(auth);
      console.log("Firebase sign out successful");
    } catch (firebaseError) {
      console.log(
        "Firebase sign out failed or no user logged in:",
        firebaseError
      );
    }

    // Dispatch event to notify components about logout
    window.dispatchEvent(
      new CustomEvent("userLoggedOut", {
        detail: { timestamp: Date.now() },
      })
    );

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear IndexedDB
    if ("indexedDB" in window) {
      try {
        // Clear Firebase IndexedDB
        const deleteReq = indexedDB.deleteDatabase("firebaseLocalStorageDb");
        deleteReq.onsuccess = () => console.log("Firebase IndexedDB cleared");
        deleteReq.onerror = () =>
          console.log("Error clearing Firebase IndexedDB");

        // Clear other possible IndexedDB databases
        const deleteReq2 = indexedDB.deleteDatabase("firebase-auth-db");
        deleteReq2.onsuccess = () =>
          console.log("Firebase Auth IndexedDB cleared");
        deleteReq2.onerror = () =>
          console.log("Error clearing Firebase Auth IndexedDB");
      } catch (e) {
        console.log("IndexedDB not available or error:", e);
      }
    }

    // Clear cookies (if any)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log("All user data cleared successfully");

    // Force reload to ensure clean state
    window.location.reload();
  } catch (error) {
    console.error("Error clearing user data:", error);
    // Fallback: just reload the page
    window.location.reload();
  }
};

// Function to clear only Firebase auth data
export const clearFirebaseAuth = async () => {
  try {
    // Import Firebase auth dynamically
    const { auth, signOut } = await import("../lib/firebase.js");

    // Sign out from Firebase
    await signOut(auth);

    // Clear Firebase IndexedDB
    if ("indexedDB" in window) {
      try {
        const deleteReq = indexedDB.deleteDatabase("firebaseLocalStorageDb");
        deleteReq.onsuccess = () => console.log("Firebase IndexedDB cleared");
        deleteReq.onerror = () =>
          console.log("Error clearing Firebase IndexedDB");
      } catch (e) {
        console.log("IndexedDB not available");
      }
    }

    console.log("Firebase auth cleared");
  } catch (error) {
    console.error("Error clearing Firebase auth:", error);
  }
};
