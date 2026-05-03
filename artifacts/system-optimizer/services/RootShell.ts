import { NativeModules, Platform } from "react-native";

import { createLogger } from "@/utils/logger";

const log = createLogger("RootShell");

/**
 * Bridge to the (future) Android native module `RootShell`.
 *
 * IMPORTANT: unlike `DeepPermissions`, this bridge performs DESTRUCTIVE
 * operations — force-stopping apps and deleting their cache directories
 * via `su` / Shizuku. We deliberately do NOT simulate success when the
 * native module is missing. Instead callers receive a typed error so the
 * UI can show an honest "Native module required" message.
 *
 * Expected Kotlin contract (drop-in later):
 *
 *   class RootShellModule : ReactContextBaseJavaModule() {
 *     @ReactMethod fun forceStopApp(pkg: String, p: Promise) {
 *       val ok = executeRootCommand("am force-stop $pkg")
 *       p.resolve(ok)
 *     }
 *     @ReactMethod fun clearAppCache(pkg: String, p: Promise) {
 *       val ok = executeRootCommand(
 *         "rm -rf /data/data/$pkg/cache/* /data/data/$pkg/code_cache/* " +
 *         "/sdcard/Android/data/$pkg/cache/*"
 *       )
 *       p.resolve(ok)
 *     }
 *     @ReactMethod fun suspendApp(pkg: String, p: Promise) {
 *       val ok = executeRootCommand("pm suspend $pkg")
 *       p.resolve(ok)
 *     }
 *     @ReactMethod fun unsuspendApp(pkg: String, p: Promise) {
 *       val ok = executeRootCommand("pm unsuspend $pkg")
 *       p.resolve(ok)
 *     }
 *     @ReactMethod fun enableApp(pkg: String, p: Promise) {
 *       val ok = executeRootCommand("pm enable $pkg")
 *       p.resolve(ok)
 *     }
 *     @ReactMethod fun isAvailable(p: Promise) { p.resolve(checkRootOrShizuku()) }
 *   }
 */
export interface RootShellModule {
  forceStopApp?: (packageName: string) => Promise<boolean>;
  clearAppCache?: (packageName: string) => Promise<boolean>;
  suspendApp?: (packageName: string) => Promise<boolean>;
  unsuspendApp?: (packageName: string) => Promise<boolean>;
  enableApp?: (packageName: string) => Promise<boolean>;
  isAvailable?: () => Promise<boolean>;
}

export class NativeModuleUnavailableError extends Error {
  public readonly code = "NATIVE_MODULE_UNAVAILABLE";
  constructor(method: string) {
    super(
      `RootShell.${method} is not available in this build. ` +
        `It will be executed via Root/Shizuku in the compiled production app.`,
    );
    this.name = "NativeModuleUnavailableError";
  }
}

function getNativeModule(): RootShellModule | null {
  const mod = (NativeModules as Record<string, unknown>).RootShell;
  if (mod && typeof mod === "object") return mod as RootShellModule;
  return null;
}

export function isRootShellAvailable(): boolean {
  return Platform.OS === "android" && getNativeModule() !== null;
}

const PACKAGE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function isValidPackageName(pkg: string): boolean {
  return PACKAGE_NAME_RE.test(pkg.trim());
}

async function callNative(
  method: "forceStopApp" | "clearAppCache" | "suspendApp" | "unsuspendApp" | "enableApp",
  packageName: string,
): Promise<boolean> {
  const native = getNativeModule();
  const fn = native?.[method];
  if (!native || typeof fn !== "function") {
    log.warn(
      `RootShell.${method}("${packageName}") aborted — native module not installed.`,
    );
    throw new NativeModuleUnavailableError(method);
  }
  try {
    const ok = await fn.call(native, packageName);
    return Boolean(ok);
  } catch (err) {
    log.error(`RootShell.${method} failed`, err);
    throw err;
  }
}

export function forceStopApp(packageName: string): Promise<boolean> {
  return callNative("forceStopApp", packageName);
}

export function clearAppCache(packageName: string): Promise<boolean> {
  return callNative("clearAppCache", packageName);
}

export function suspendApp(packageName: string): Promise<boolean> {
  return callNative("suspendApp", packageName);
}

export function unsuspendApp(packageName: string): Promise<boolean> {
  return callNative("unsuspendApp", packageName);
}

export function enableApp(packageName: string): Promise<boolean> {
  return callNative("enableApp", packageName);
}
