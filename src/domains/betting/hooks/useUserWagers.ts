import { useQuery } from "@tanstack/react-query";
import { fetchUserWagers } from "@domains/betting/api/bettingApi";

export const useUserWagers = (userId?: string) => {
  return useQuery({
    queryKey: ["user-wagers", userId],
    queryFn: () => fetchUserWagers(userId!),
    enabled: !!userId
  });
};
