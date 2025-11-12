import { useState, useEffect } from "react";
import { api } from "../lib/api";

/**
 * Custom hook to fetch specializations
 * @returns {Object} { specializations, isLoading, error }
 */
export function useSpecializations() {
  const [specializations, setSpecializations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get("/api/specializations");
        if (response.success) {
          setSpecializations(response.data || []);
        } else {
          setError(new Error("Failed to fetch specializations"));
        }
      } catch (err) {
        console.error("Error fetching specializations:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecializations();
  }, []);

  return { specializations, isLoading, error };
}
