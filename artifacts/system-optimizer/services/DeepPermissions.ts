import { NativeModules, Platform } from "react-native";

import { createLogger } from "@/utils/logger";

const log = createLogger("DeepPermissions");

/**
 * Permission keys understood by the Permissions Onboarding flow and the
 * (future) Android native module `DeepPermissions`.
 *
 *  - usageStats        → PACKAGE_USAGE_STATS, needed to query other apps' cache size
 *  - manageStorage     → MANAGE_EXTERNAL_STORAGE, needed for deep cleaning
 *  - accessibility     → Accessibility Service, needed to force-stop apps
 *  - root              → su shell access, needed for elevated cleanup ops
 */
export type DeepPermissionKey =
  | "usageStats"
  | "manageStorage"
  | "accessibility"
  | "root";

export type PermissionStatus = "unknown" | "granted" | "denied";

export interface DeepPermissionsModule {
  requestUsageStats?: () => Promise<boolean>;
  requestManageStorage?: () => Promise<boolean>;
  requestAccessibility?: () => Promise<boolean>;
  requestRoot?: () => Promise<boolean>;
  checkUsageStats?: () => Promise<boolean>;
  checkManageStorage?: () => Promise<boolean>;
  checkAccessibility?: () => Promise<boolean>;
  checkRoot?: () => Promise<boolean>;
}

/**
 * Returns the native module if it has been wired up in the
 * Android/Kotlin layer. When the module is missing (e.g. inside Expo Go
 * during development) this returns null and callers fall back to the
 * dev-mode simulation defined below.
 */
export function getNativeModule(): DeepPermissionsModule | null {
  const mod = (NativeModules as Record<string, unknown>).DeepPermissions;
  if (mod && typeof mod === "object") return mod as DeepPermissionsModule;
  return null;
}

export function isNativeBridgeAvailable(): boolean {
  return Platform.OS === "android" && getNativeModule() !== null;
}

/**
 * Dev-mode simulator. NOT a placeholder for production behavior — it is
 * an explicit developer stub so the JS-only build can exercise the
 * onboarding flow before the Kotlin module ships. Every call is logged
 * so it is obvious in the logs that no real OS permission was changed.
 */
async function simulateGrant(key: DeepPermissionKey): Promise<boolean> {
  log.warn(
    `[DEV SIMULATION] requestPermission(${key}) — no native module installed; ` +
      `granting after 1s. Replace with NativeModules.DeepPermissions.${requestMethodFor(
        key,
      )}() once the Android module ships.`,
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true;
}

function requestMethodFor(key: DeepPermissionKey): string {
  switch (key) {
    case "usageStats":
      return "requestUsageStats";
    case "manageStorage":
      return "requestManageStorage";
    case "accessibility":
      return "requestAccessibility";
    case "root":
      return "requestRoot";
  }
}

function checkMethodFor(key: DeepPermissionKey): keyof DeepPermissionsModule {
  switch (key) {
    case "usageStats":
      return "checkUsageStats";
    case "manageStorage":
      return "checkManageStorage";
    case "accessibility":
      return "checkAccessibility";
    case "root":
      return "checkRoot";
  }
}

export async function requestPermission(
  key: DeepPermissionKey,
): Promise<boolean> {
  const native = getNativeModule();
  if (native) {
    const fnName = requestMethodFor(key) as keyof DeepPermissionsModule;
    const fn = native[fnName];
    if (typeof fn === "function") {
      try {
        const result = await fn.call(native);
        return Boolean(result);
      } catch (err) {
        log.error(`Native ${String(fnName)} threw`, err);
        return false;
      }
    }
  }
  return simulateGrant(key);
}

export async function checkPermission(
  key: DeepPermissionKey,
): Promise<PermissionStatus> {
  const native = getNativeModule();
  if (native) {
    const fnName = checkMethodFor(key);
    const fn = native[fnName];
    if (typeof fn === "function") {
      try {
        const result = await fn.call(native);
        return result ? "granted" : "denied";
      } catch (err) {
        log.error(`Native ${String(fnName)} threw`, err);
        return "unknown";
      }
    }
  }
  return "unknown";
}
