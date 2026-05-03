# System Optimizer & Cleaner

A mobile-first Expo (React Native) app that helps users monitor and optimize their Android device. Built with strict no-placeholders rules — every feature uses real device data via Expo APIs, with deep-links to Android Settings for operations that require system-level permissions.

## Tech stack

- **Framework:** Expo SDK 54 + Expo Router (file-based routing)
- **State:** Zustand (persisted via AsyncStorage) + React Query (device/storage queries)
- **i18n:** i18next + react-i18next, Arabic-first with English fallback
- **RTL:** I18nManager + auto-reload on language change
- **UI:** React Native StyleSheet + Cairo font (Arabic-friendly), Feather icons, react-native-svg for the storage progress ring
- **Native APIs used:** expo-device, expo-battery, expo-file-system, expo-application, expo-intent-launcher, expo-haptics

## Project layout

```
app/                    # Expo Router screens
  _layout.tsx           # Providers + RTL bootstrap + font loading
  (tabs)/
    _layout.tsx         # 5-tab bottom bar (Dashboard / Junk / Cache / Apps / Settings)
    index.tsx           # Dashboard
    junk.tsx
    cache.tsx
    apps.tsx
    settings.tsx
components/ui/          # Reusable Card, Button, ProgressRing, ProgressBar, StatTile, EmptyState, SectionHeader
constants/colors.ts     # Light + dark palette
hooks/                  # useColors, useDeviceInfo, useBatteryInfo, useStorageInfo, useJunkScan
i18n/                   # ar.ts (default), en.ts, index.ts (init helper)
services/               # DeviceService, StorageService, JunkScannerService, CacheService, AppManagerService, SystemBridge
store/                  # settingsStore (locale, theme), scanStore (last scan)
types/                  # Shared interfaces
utils/                  # format, logger
assets/images/icon.png  # App icon (generated)
```

## What's real vs. what's a deep-link

| Feature | How it works |
|---|---|
| Storage total/free/used | Real, via `FileSystem.getFreeDiskStorageAsync` + `getTotalDiskCapacityAsync` |
| Device info (brand/model/OS/RAM) | Real, via `expo-device` |
| Battery level / state / low-power | Real, live listeners via `expo-battery` |
| Junk scan | Real walk of `FileSystem.cacheDirectory` (the only dir Android allows for this app) |
| Cache cleaning | Real `FileSystem.deleteAsync` on this app's own cache |
| Other apps' caches / installed apps list / running services | NOT possible from JS on modern Android. The app honestly says so and opens the corresponding Android Settings page via `expo-intent-launcher`. |

`services/SystemBridge.ts` is the single integration point if a custom native module (Kotlin) is added later for elevated/root operations.

## Privacy

100% local. No backend, no analytics, no network calls.
