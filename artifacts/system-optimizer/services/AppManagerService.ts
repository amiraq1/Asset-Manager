import type { SystemActionShortcut } from "@/types";
import { AndroidActions, openAndroidSetting } from "./SystemBridge";

/**
 * Curated list of real, working Android system intents that let the user
 * manage installed apps, running services, storage, battery, and memory.
 * Each shortcut opens a native Settings page — these are NOT mock buttons.
 */
export const SYSTEM_SHORTCUTS: SystemActionShortcut[] = [
  {
    id: "app-manager",
    titleKey: "apps.openAppManager",
    descriptionKey: "cache.openAppSettings",
    icon: "grid",
    androidAction: AndroidActions.applicationsList,
  },
  {
    id: "running-services",
    titleKey: "apps.openRunningServices",
    descriptionKey: "apps.openRunningServices",
    icon: "activity",
    androidAction: AndroidActions.developer,
  },
  {
    id: "storage",
    titleKey: "cache.openStorageSettings",
    descriptionKey: "cache.openStorageSettings",
    icon: "hard-drive",
    androidAction: AndroidActions.storage,
  },
  {
    id: "battery",
    titleKey: "cache.openBatterySettings",
    descriptionKey: "cache.openBatterySettings",
    icon: "battery-charging",
    androidAction: AndroidActions.battery,
  },
  {
    id: "memory",
    titleKey: "cache.openMemorySettings",
    descriptionKey: "cache.openMemorySettings",
    icon: "cpu",
    androidAction: AndroidActions.memoryCard,
  },
];

export async function runShortcut(shortcut: SystemActionShortcut): Promise<void> {
  if (!shortcut.androidAction) return;
  await openAndroidSetting(shortcut.androidAction);
}
