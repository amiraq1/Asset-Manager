import { NativeModules, Platform } from "react-native";
import { createLogger } from "@/utils/logger";
import { commandLogger } from "./CommandLogger";

const log = createLogger("RootShell");

/**
 * Bridge to the (future) Android native module `RootShell`.
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

const METHOD_COMMANDS: Record<string, string> = {
  forceStopApp: "am force-stop",
  clearAppCache: "rm -rf /data/data/$pkg/cache",
  suspendApp: "pm suspend",
  unsuspendApp: "pm unsuspend",
  enableApp: "pm enable",
};

async function callNative(
  method: "forceStopApp" | "clearAppCache" | "suspendApp" | "unsuspendApp" | "enableApp",
  packageName: string,
): Promise<boolean> {
  const baseCmd = METHOD_COMMANDS[method] || "sh";
  const fullCmd = baseCmd.replace("$pkg", packageName) + " " + (method === "clearAppCache" ? "" : packageName);
  
  const logId = commandLogger.addLog(`> ${fullCmd}`, "root");
  
  // Simulate shell latency for visual feedback in Live Terminal
  await new Promise(resolve => setTimeout(resolve, 500));

  const native = getNativeModule();
  const fn = native?.[method];
  if (!native || typeof fn !== "function") {
    log.warn(
      `RootShell.${method}("${packageName}") aborted — native module not installed.`,
    );
    commandLogger.updateLog(logId, "error");
    throw new NativeModuleUnavailableError(method);
  }
  try {
    const ok = await fn.call(native, packageName);
    commandLogger.updateLog(logId, ok ? "success" : "error");
    return Boolean(ok);
  } catch (err) {
    log.error(`RootShell.${method} failed`, err);
    commandLogger.updateLog(logId, "error");
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
