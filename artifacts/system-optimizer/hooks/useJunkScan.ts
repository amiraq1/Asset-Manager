import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

import { cleanItems, scanForJunk } from "@/services/JunkScannerService";
import { useScanStore } from "@/store/scanStore";
import type { JunkCategory, JunkItem, JunkScanResult } from "@/types";

export function useJunkScan() {
  const lastScan = useScanStore((s) => s.lastScan);
  const setLastScan = useScanStore((s) => s.setLastScan);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const scan = useCallback(async (): Promise<JunkScanResult | null> => {
    setError(null);
    setScanning(true);
    try {
      const result = await scanForJunk();
      setLastScan(result);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return result;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setScanning(false);
    }
  }, [setLastScan]);

  const clean = useCallback(
    async (
      category?: JunkCategory,
    ): Promise<{ deletedBytes: number; failed: number } | null> => {
      if (!lastScan) return null;
      setError(null);
      setCleaning(true);
      try {
        const targets: JunkItem[] = category
          ? lastScan.items.filter((i) => i.category === category)
          : lastScan.items;
        const result = await cleanItems(targets);
        // Re-scan so UI reflects reality after deletion
        const fresh = await scanForJunk();
        setLastScan(fresh);
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(
            result.failed === 0
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning,
          );
        }
        return result;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setCleaning(false);
      }
    },
    [lastScan, setLastScan],
  );

  return { lastScan, scan, clean, scanning, cleaning, error };
}
