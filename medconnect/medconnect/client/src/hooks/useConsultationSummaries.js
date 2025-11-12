import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

/**
 * Hook to fetch patient's consultation summaries (medical history)
 */
export function useConsultationSummaries(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["consultationSummaries", page, limit],
    queryFn: async () => {
      const response = await api.get(
        `/api/patients/me/consultation-summaries`,
        {
          params: { page, limit },
        }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a single consultation summary by ID
 */
export function useConsultationSummary(summaryId) {
  return useQuery({
    queryKey: ["consultationSummary", summaryId],
    queryFn: async () => {
      const response = await api.get(
        `/api/patients/me/consultation-summaries/${summaryId}`
      );
      return response.data;
    },
    enabled: !!summaryId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}
