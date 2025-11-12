import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}


