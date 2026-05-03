export interface DeviceInfo {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  totalMemoryBytes: number | null;
  isDevice: boolean;
}

export interface StorageInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export type BatteryState =
  | "charging"
  | "full"
  | "unplugged"
  | "unknown";

export interface BatteryInfo {
  level: number;
  state: BatteryState;
  lowPowerMode: boolean;
}

export type JunkCategory =
  | "cache"
  | "temp"
  | "log"
  | "other"
  | "obsoleteApk"
  | "emptyFolder"
  | "systemDeep";

export interface JunkItem {
  uri: string;
  name: string;
  sizeBytes: number;
  modifiedAt: number;
  category: JunkCategory;
  /**
   * True for items that cannot be deleted from JS alone — they require
   * the future `NativeModules.JunkScanner.deleteFiles()` bridge.
   */
  requiresNative?: boolean;
  /** Optional human-readable note (e.g. why a native module is needed). */
  note?: string;
}

export interface JunkCategorySummary {
  count: number;
  bytes: number;
}

export interface JunkScanResult {
  totalBytes: number;
  itemCount: number;
  byCategory: Record<JunkCategory, JunkCategorySummary>;
  items: JunkItem[];
  scannedDirs: string[];
  scannedAt: number;
}

export interface SystemActionShortcut {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  androidAction?: string;
}
