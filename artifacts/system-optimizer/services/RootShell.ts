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
 *     @ReactMethod fun isAvailable(p: Promise) { p.resolve(checkRootOrShizuku()) }
 *   }
 */
export interface RootShellModule {
  forceStopApp?: (packageName: string) => Promise<boolean>;
  clearAppCache?: (packageName: string) => Promise<boolean>;
  isAvailable?: () => Promise<boolean>;
  /**
   * Kernel-level RAM drop. Expected Kotlin contract:
   *
   *   @ReactMethod fun forceDropCaches(p: Promise) {
   *     val ok = executeRootCommand("sync && echo 3 > /proc/sys/vm/drop_caches")
   *     p.resolve(ok)
   *   }
   *
   * Writing `3` flushes pagecache + dentries + inodes — the most aggressive
   * non-destructive RAM reclaim available on Linux/Android kernels. Requires
   * root or Shizuku because `/proc/sys/vm/drop_caches` is owned by root.
   */
  forceDropCaches?: () => Promise<boolean>;
}

export class NativeModuleUnavailableError extends Error {
  public readonly code = "NATIVE_MODULE_UNAVAILABLE";
  public readonly method: string;
  constructor(method: string) {
    super(
      method === "forceDropCaches"
        ? "Kernel-level RAM drop requires Root/Shizuku."
        : `RootShell.${method} is not available in this build. ` +
            `It will be executed via Root/Shizuku in the compiled production app.`,
    );
    this.name = "NativeModuleUnavailableError";
    this.method = method;
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

/**
 * Kernel-level RAM drop via `sync && echo 3 > /proc/sys/vm/drop_caches`.
 * Throws `NativeModuleUnavailableError` when the native bridge is missing —
 * we deliberately do NOT simulate this, because pretending the kernel was
 * flushed when it wasn't would mislead the user about real device state.
 */
export async function forceDropCaches(): Promise<boolean> {
  const native = getNativeModule();
  const fn = native?.forceDropCaches;
  if (!native || typeof fn !== "function") {
    log.warn(
      "RootShell.forceDropCaches aborted — native module not installed.",
    );
    throw new NativeModuleUnavailableError("forceDropCaches");
  }
  try {
    const ok = await fn.call(native);
    return Boolean(ok);
  } catch (err) {
    log.error("RootShell.forceDropCaches failed", err);
    throw err;
  }
}

async function callNative(
  method: "forceStopApp" | "clearAppCache",
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
