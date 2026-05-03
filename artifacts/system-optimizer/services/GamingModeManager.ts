import { commandLogger } from "./CommandLogger";
import { getRunningApps } from "./TaskManager";
import * as RootShell from "./RootShell";
import { createLogger } from "@/utils/logger";

const log = createLogger("GamingModeManager");

export interface GameInfo {
  packageName: string;
  label: string;
  icon?: string;
  lastPlayed?: string;
}

const MOCKED_GAMES: GameInfo[] = [
  { packageName: "com.tencent.ig", label: "PUBG Mobile", lastPlayed: "2 hours ago" },
  { packageName: "com.miHoYo.GenshinImpact", label: "Genshin Impact", lastPlayed: "Yesterday" },
  { packageName: "com.activision.callofduty.shooter", label: "Call of Duty: Mobile", lastPlayed: "3 days ago" },
  { packageName: "com.epicgames.fortnite", label: "Fortnite", lastPlayed: "Never" },
];

export async function getGamesList(): Promise<GameInfo[]> {
  // In a real app, we'd query the package manager for categories or use a preset list
  return MOCKED_GAMES;
}

export async function launchGameInDeepMode(gamePackage: string): Promise<number> {
  log.info(`Initiating Deep Gaming Lockdown for ${gamePackage}`);
  commandLogger.addLog("> Initiating Deep Gaming Lockdown...", "root");

  const runningApps = await getRunningApps();
  const appsToFreeze = runningApps.filter(app => app.packageName !== gamePackage && app.packageName !== "host.exp.exponent"); // Don't freeze ourselves

  let totalRamFreed = 0;
  
  // Sequence of actions
  commandLogger.addLog(`> Freezing ${appsToFreeze.length} background processes...`, "root");
  
  for (const app of appsToFreeze) {
    try {
      // We use suspend for gaming mode so they don't restart immediately
      await RootShell.suspendApp(app.packageName);
      totalRamFreed += app.ramMb;
    } catch (e) {
      // Fallback to force stop if suspend fails or isn't available
      try {
        await RootShell.forceStopApp(app.packageName);
        totalRamFreed += app.ramMb;
      } catch (err) {
        log.warn(`Failed to stop ${app.packageName}`, err);
      }
    }
  }

  commandLogger.addLog(`> Lockdown Complete. RAM Allocated: ${totalRamFreed}MB`, "success");
  return totalRamFreed;
}

export async function restoreSystemNormal(): Promise<void> {
  log.info("Restoring system to normal state");
  commandLogger.addLog("> Releasing Deep Gaming Lockdown...", "root");

  const runningApps = await getRunningApps(); // In reality, we'd keep track of what we suspended
  for (const app of runningApps) {
    try {
      await RootShell.unsuspendApp(app.packageName);
      await RootShell.enableApp(app.packageName);
    } catch (e) {
      log.warn(`Failed to restore ${app.packageName}`, e);
    }
  }
  
  commandLogger.addLog("> System normalization complete.", "success");
}
