/**
 * SystemBridge — single integration point between the JS app and any
 * future native module(s) the user adds for elevated/root operations.
 *
 * Today, every method has a real, working implementation using
 * Expo APIs and Android Settings deep-links. When the user later
 * ships a custom native module (Kotlin), they only need to swap the
 * implementation of the methods marked `@nativeOverridePoint`.
 */

import { Platform, Linking } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

import { createLogger } from "@/utils/logger";

const log = createLogger("SystemBridge");

/** Common Android Settings actions used as deep-link fallbacks. */
export const AndroidActions = {
  applicationDetails: "android.settings.APPLICATION_DETAILS_SETTINGS",
  applicationsList: "android.settings.MANAGE_APPLICATIONS_SETTINGS",
  storage: "android.settings.INTERNAL_STORAGE_SETTINGS",
  battery: "android.settings.BATTERY_SAVER_SETTINGS",
  memoryCard: "android.settings.MEMORY_CARD_SETTINGS",
  developer: "android.settings.APPLICATION_DEVELOPMENT_SETTINGS",
  applicationSettings: "android.settings.APPLICATION_SETTINGS",
} as const;

export class SystemBridgeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SystemBridgeError";
  }
}

/** Open a system Settings page on Android. iOS opens generic settings. */
export async function openAndroidSetting(action: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await IntentLauncher.startActivityAsync(action);
      return;
    }
    // iOS / web fallback: open the generic app settings URL
    await Linking.openSettings();
  } catch (err) {
    log.error("openAndroidSetting failed", err);
    throw new SystemBridgeError(`Could not open setting: ${action}`, err);
  }
}

/**
 * @nativeOverridePoint
 * Returns true when a native bridge capable of root/system operations is
 * installed. Today we have no such module so this is always false. The
 * UI uses this to decide whether to show the Settings deep-link fallback.
 */
export function hasNativeRootBridge(): boolean {
  return false;
}
