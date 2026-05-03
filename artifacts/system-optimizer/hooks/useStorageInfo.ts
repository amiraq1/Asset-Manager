import { useQuery } from "@tanstack/react-query";

import { getStorageInfo } from "@/services/StorageService";
import type { StorageInfo } from "@/types";

export function useStorageInfo() {
  return useQuery<StorageInfo>({
    queryKey: ["storageInfo"],
    queryFn: getStorageInfo,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}
