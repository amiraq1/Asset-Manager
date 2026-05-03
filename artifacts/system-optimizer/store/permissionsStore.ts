import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  DeepPermissionKey,
  PermissionStatus,
} from "@/services/DeepPermissions";

export type PermissionsMap = Record<DeepPermissionKey, PermissionStatus>;

const DEFAULT: PermissionsMap = {
  usageStats: "unknown",
  manageStorage: "unknown",
  accessibility: "unknown",
  root: "unknown",
};

/** Required permissions gate access to the main dashboard. */
export const REQUIRED_PERMISSIONS: DeepPermissionKey[] = [
  "usageStats",
  "manageStorage",
];

interface PermissionsState {
  permissions: PermissionsMap;
  onboardingCompleted: boolean;
  setStatus: (key: DeepPermissionKey, status: PermissionStatus) => void;
  resetAll: () => void;
  completeOnboarding: () => void;
  reopenOnboarding: () => void;
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set) => ({
      permissions: { ...DEFAULT },
      onboardingCompleted: false,
      setStatus: (key, status) =>
        set((s) => ({ permissions: { ...s.permissions, [key]: status } })),
      resetAll: () =>
        set({ permissions: { ...DEFAULT }, onboardingCompleted: false }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      reopenOnboarding: () => set({ onboardingCompleted: false }),
    }),
    {
      name: "system-optimizer.permissions",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        permissions: s.permissions,
        onboardingCompleted: s.onboardingCompleted,
      }),
    },
  ),
);

export function hasAllRequired(perms: PermissionsMap): boolean {
  return REQUIRED_PERMISSIONS.every((k) => perms[k] === "granted");
}
