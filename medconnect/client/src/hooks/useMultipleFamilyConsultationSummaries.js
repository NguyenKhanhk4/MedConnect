import { useQueries } from "@tanstack/react-query";
import { api } from "../lib/api.js";

/**
 * Hook to fetch consultation summaries for multiple Patient IDs
 * @param {string[]} patientIds - Array of family member's patient IDs
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
export function useMultipleFamilyConsultationSummaries(
  patientIds = [],
  page = 1,
  limit = 1000
) {
  const queries = useQueries({
    queries: patientIds.map((patientId) => ({
      queryKey: ["familyConsultationSummaries", patientId, page, limit],
      queryFn: async () => {
        const response = await api.get(
          `/api/patients/${patientId}/consultation-summaries`,
          {
            params: { page, limit },
          }
        );
        return response.data;
      },
      enabled: !!patientId && patientIds.length > 0,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    })),
  });

  // Combine all results
  const allSummaries = queries
    .map((query) => query.data?.consultationSummaries || [])
    .flat();

  // Sort by date (newest first)
  allSummaries.sort((a, b) => {
    const dateA = new Date(a.fullDetails?.visitDate || a.date || 0);
    const dateB = new Date(b.fullDetails?.visitDate || b.date || 0);
    return dateB - dateA;
  });

  return {
    consultationSummaries: allSummaries,
    isLoading: queries.some((query) => query.isLoading),
    error: queries.find((query) => query.error)?.error || null,
  };
}
