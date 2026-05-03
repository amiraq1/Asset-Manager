import { NativeModules, Platform } from "react-native";

import { CommandLogger, type LogSource } from "@/services/CommandLogger";
import { createLogger } from "@/utils/logger";

const log = createLogger("RootShell");

export interface RootShellModule {
  forceStopApp?: (packageName: string) => Promise<boolean>;
  clearAppCache?: (packageName: string) => Promise<boolean>;
  suspendApp?: (packageName: string) => Promise<boolean>;
  unsuspendApp?: (packageName: string) => Promise<boolean>;
  enableApp?: (packageName: string) => Promise<boolean>;
  isAvailable?: () => Promise<boolean>;
  forceDropCaches?: () => Promise<boolean>;
}

export class NativeModuleUnavailableError extends Error {
  public readonly code = "NATIVE_MODULE_UNAVAILABLE";
  public readonly method: string;

  constructor(method: string) {
    super(
      method === "forceDropCaches"
        ? "Kernel-level RAM drop requires Root/Shizuku."
        : `RootShell.${method} is not available in this build. It will be executed via Root/Shizuku in the compiled production app.`,
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

export async function forceDropCaches(): Promise<boolean> {
  const native = getNativeModule();
  const fn = native?.forceDropCaches;
  const source: LogSource = native ? "ROOT" : "SYSTEM";

  const logId = CommandLogger.addLog(
    "> sync && echo 3 > /proc/sys/vm/drop_caches && am kill-all",
    source,
  );

  if (!native || typeof fn !== "function") {
    log.warn("RootShell.forceDropCaches aborted — native module not installed.");
    CommandLogger.updateLog(logId, "error");
    throw new NativeModuleUnavailableError("forceDropCaches");
  }

  try {
    const ok = await fn.call(native);
    CommandLogger.updateLog(logId, ok ? "success" : "error");
    return Boolean(ok);
  } catch (err) {
    log.error("RootShell.forceDropCaches failed", err);
    CommandLogger.updateLog(logId, "error");
    throw err;
  }
}

const COMMAND_TEMPLATES: Record<
  "forceStopApp" | "clearAppCache" | "suspendApp" | "unsuspendApp" | "enableApp",
  (pkg: string) => string
> = {
  forceStopApp: (pkg) => `> am force-stop ${pkg}`,
  clearAppCache: (pkg) =>
    `> rm -rf /data/data/${pkg}/cache/* /sdcard/Android/data/${pkg}/cache/*`,
  suspendApp: (pkg) => `> pm suspend ${pkg}`,
  unsuspendApp: (pkg) => `> pm unsuspend ${pkg}`,
  enableApp: (pkg) => `> pm enable ${pkg}`,
};

async function callNative(
  method: "forceStopApp" | "clearAppCache" | "suspendApp" | "unsuspendApp" | "enableApp",
  packageName: string,
): Promise<boolean> {
  const native = getNativeModule();
  const fn = native?.[method];
  const source: LogSource = native ? "ROOT" : "SYSTEM";

  const logId = CommandLogger.addLog(
    COMMAND_TEMPLATES[method](packageName),
    source,
  );

  if (!native || typeof fn !== "function") {
    log.warn(`RootShell.${method}("${packageName}") aborted — native module not installed.`);
    CommandLogger.updateLog(logId, "error");
    throw new NativeModuleUnavailableError(method);
  }

  try {
    const ok = await fn.call(native, packageName);
    CommandLogger.updateLog(logId, ok ? "success" : "error");
    return Boolean(ok);
  } catch (err) {
    log.error(`RootShell.${method} failed`, err);
    CommandLogger.updateLog(logId, "error");
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