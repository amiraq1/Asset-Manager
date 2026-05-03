import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { JunkScanResult } from "@/types";

interface ScanState {
  lastScan: JunkScanResult | null;
  setLastScan: (result: JunkScanResult | null) => void;
  clearLastScan: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      lastScan: null,
      setLastScan: (result) => set({ lastScan: result }),
      clearLastScan: () => set({ lastScan: null }),
    }),
    {
      name: "system-optimizer.scan",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ...state,
        lastScan: state.lastScan
          ? { ...state.lastScan, items: [] }
          : null,
      }),
    },
  ),
);
