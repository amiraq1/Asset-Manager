/**
 * Locale-aware byte / percentage / date formatters used across the app.
 * `locale` is the active app language (e.g. "ar" or "en") and controls
 * digit shaping and unit translations.
 */

const BYTE_UNITS_AR = ["بايت", "كيلوبايت", "ميغابايت", "غيغابايت", "تيرابايت"];
const BYTE_UNITS_EN = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number, locale: string = "ar"): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0";
  if (bytes === 0) {
    const unit = locale === "ar" ? BYTE_UNITS_AR[0] : BYTE_UNITS_EN[0];
    return `0 ${unit}`;
  }
  const units = locale === "ar" ? BYTE_UNITS_AR : BYTE_UNITS_EN;
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  const localized = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    {
      maximumFractionDigits: 1,
    },
  ).format(Number(formatted));
  return `${localized} ${units[i]}`;
}

export function formatPercent(value: number, locale: string = "ar"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatNumber(value: number, locale: string = "ar"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-US",
  ).format(safe);
}

export function formatRelativeTime(
  timestamp: number,
  locale: string = "ar",
): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { numeric: "auto" },
  );
  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}
