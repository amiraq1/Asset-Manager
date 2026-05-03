import {
  forceStopApp,
  isRootShellAvailable,
  NativeModuleUnavailableError,
} from "@/services/RootShell";
import { getInstalledApps, type InstalledApp } from "@/services/DeviceStats";
import { createLogger } from "@/utils/logger";

const log = createLogger("TaskManager");

const MIN_RAM_MB = 50;
const MAX_RAM_MB = 300;

export interface RunningApp extends InstalledApp {
  /**
   * Estimated RAM usage in MB. Stable across calls (derived from a hash of the
   * package name) so the UI doesn't flicker between renders. When the native
   * `DeviceStats.getRunningProcesses` bridge lands later, replace this with
   * the live PSS/RSS reading and set `source` to `"native"`.
   */
  ramMb: number;
  /** "native" once the native bridge fills this in; "estimate" today. */
  ramSource: "native" | "estimate";
}

export interface BoostResult {
  /** MB attributed to the apps the user asked to stop. */
  freedMb: number;
  /** Apps that were stopped successfully (or estimated stopped in dev mode). */
  stoppedPackages: string[];
  /** Apps that returned an error. */
  failedPackages: string[];
  /** True when at least one stop was simulated because no native bridge exists. */
  simulated: boolean;
}

/**
 * djb2 string hash → deterministic small integer. Used to give every
 * package a stable "fake RAM" value so the list doesn't jitter between
 * re-renders.
 */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function estimateRamMb(packageName: string): number {
  const range = MAX_RAM_MB - MIN_RAM_MB;
  return MIN_RAM_MB + (hash(packageName) % (range + 1));
}

/**
 * Returns the list of "running" apps with a per-app RAM estimate.
 *
 * In the current Expo Go build there is no `ActivityManager` bridge,
 * so this is the installed-apps list with deterministic RAM estimates.
 * The shape will not change once a native bridge is wired — only the
 * `ramSource` field flips from `"estimate"` to `"native"`.
 */
export async function getRunningApps(): Promise<RunningApp[]> {
  const apps = await getInstalledApps();
  return apps
    .map((a) => ({
      ...a,
      ramMb: estimateRamMb(a.packageName),
      ramSource: "estimate" as const,
    }))
    .sort((a, b) => b.ramMb - a.ramMb);
}

/**
 * Boosts RAM by force-stopping each given package via `RootShell`.
 *
 * - When the native `RootShell` bridge is installed, each call hits
 *   `am force-stop <pkg>` over root/Shizuku and the count is real.
 * - In dev/Expo Go the bridge throws `NativeModuleUnavailableError`,
 *   which we catch and treat as a successful "simulated stop" so the
 *   UI flow is testable end-to-end. The returned `simulated` flag is
 *   set to `true` so the caller can disclose this to the user.
 *
 * The freed-MB total is computed from the same per-app estimates that
 * `getRunningApps` returns, so the number the user sees in the toast
 * matches the bars they just removed from the list.
 */
export async function boostRam(packages: string[]): Promise<BoostResult> {
  const native = isRootShellAvailable();
  let freedMb = 0;
  const stopped: string[] = [];
  const failed: string[] = [];
  let simulated = false;

  for (const pkg of packages) {
    try {
      if (native) {
        const ok = await forceStopApp(pkg);
        if (ok) {
          stopped.push(pkg);
          freedMb += estimateRamMb(pkg);
        } else {
          failed.push(pkg);
        }
      } else {
        // No native bridge — count as simulated success so the UI flow works.
        simulated = true;
        stopped.push(pkg);
        freedMb += estimateRamMb(pkg);
      }
    } catch (err) {
      log.warn(`force-stop failed for ${pkg}`, err);
      failed.push(pkg);
    }
  }

  return {
    freedMb,
    stoppedPackages: stopped,
    failedPackages: failed,
    simulated,
  };
}
