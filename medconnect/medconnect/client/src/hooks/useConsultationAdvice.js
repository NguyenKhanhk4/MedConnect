import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

/**
 * Hook to fetch patient's consultation advice (consultation history)
 */
export function useConsultationAdvice(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["consultationAdvice", page, limit],
    queryFn: async () => {
      const response = await api.get(`/api/patients/me/consultation-advice`, {
        params: { page, limit },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a single consultation advice by ID
 */
export function useConsultationAdviceDetail(adviceId) {
  return useQuery({
    queryKey: ["consultationAdvice", adviceId],
    queryFn: async () => {
      const response = await api.get(
        `/api/patients/me/consultation-advice/${adviceId}`
      );
      return response.data;
    },
    enabled: !!adviceId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}
