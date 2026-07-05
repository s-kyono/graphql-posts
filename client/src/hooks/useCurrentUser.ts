import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/queries/auth";
import type { User } from "@graphql-posts/graphql-types";

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
