import { useState, useEffect, useCallback } from "react";
import { getFamilyMembers } from "../lib/api";
import { processFamilyMembers } from "../utils/familyMemberUtils";

/**
 * Custom hook to fetch and manage family members
 * @returns {Object} { familyMembers, isLoadingMembers, refreshFamilyMembers, error }
 */
export function useFamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [error, setError] = useState(null);

  const fetchFamilyMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      setError(null);
      const response = await getFamilyMembers();
      const members = response.data?.familyMembers || [];
      const processedMembers = processFamilyMembers(members);
      setFamilyMembers(processedMembers);
      return processedMembers;
    } catch (err) {
      console.error("Error fetching family members:", err);
      setError(err);
      return [];
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const refreshFamilyMembers = useCallback(async () => {
    return await fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  return {
    familyMembers,
    isLoadingMembers,
    refreshFamilyMembers,
    error,
  };
}
