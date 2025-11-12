import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export function useClinics(
  page = 1,
  limit = 10,
  search = "",
  type = "all",
  location = "all"
) {
  return useQuery({
    queryKey: ["clinics", page, limit, search, type, location],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(type !== "all" && { type }),
        ...(location !== "all" && { location }),
      });

      const response = await api.get(`/api/clinics?${params}`);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
