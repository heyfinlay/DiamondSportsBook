import { useQuery } from "@tanstack/react-query";
import { fetchActiveTimingSession } from "@domains/timing/api/timingApi";

export const useActiveTimingSession = () =>
  useQuery({
    queryKey: ["active-timing-session"],
    queryFn: fetchActiveTimingSession,
    staleTime: 30_000
  });
