import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import type { StorageInfo } from "@/types";
import { createLogger } from "@/utils/logger";

const log = createLogger("StorageService");

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (Platform.OS === "web") {
      return { totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPercent: 0 };
    }
    const [free, total] = await Promise.all([
      FileSystem.getFreeDiskStorageAsync(),
      FileSystem.getTotalDiskCapacityAsync(),
    ]);
    const safeTotal = Math.max(0, total);
    const safeFree = Math.max(0, Math.min(free, safeTotal));
    const used = safeTotal - safeFree;
    const usedPercent = safeTotal > 0 ? used / safeTotal : 0;
    return {
      totalBytes: safeTotal,
      freeBytes: safeFree,
      usedBytes: used,
      usedPercent,
    };
  } catch (err) {
    log.error("getStorageInfo failed", err);
    return { totalBytes: 0, freeBytes: 0, usedBytes: 0, usedPercent: 0 };
  }
}
