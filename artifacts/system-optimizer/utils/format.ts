/**
 * Locale-aware byte / percentage / date formatters used across the app.
 * `locale` is the active app language (e.g. "ar" or "en") and controls
 * digit shaping and unit translations.
 *
 * All formatters include try/catch guards because Hermes (the React Native
 * JS engine) may not support every Intl API or locale combination.
 */

const BYTE_UNITS_AR = ["بايت", "كيلوبايت", "ميغابايت", "غيغابايت", "تيرابايت"];
const BYTE_UNITS_EN = ["B", "KB", "MB", "GB", "TB"];

/**
 * Safe wrapper around Intl.NumberFormat that falls back to plain toString
 * when the runtime doesn't support the requested options.
 */
function safeNumberFormat(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(
      locale === "ar" ? "ar-EG" : "en-US",
      options,
    ).format(value);
  } catch {
    // Hermes may not support certain NumberFormat options (e.g. style:"percent")
    if (options?.style === "percent") {
      return `${Math.round(value * 100)}%`;
    }
    return String(value);
  }
}

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
  const localized = safeNumberFormat(Number(formatted), locale, {
    maximumFractionDigits: 1,
  });
  return `${localized} ${units[i]}`;
}

export function formatPercent(value: number, locale: string = "ar"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safeNumberFormat(safe, locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
}

export function formatNumber(value: number, locale: string = "ar"): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safeNumberFormat(safe, locale);
}

export function formatRelativeTime(
  timestamp: number,
  locale: string = "ar",
): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.round(diffMs / 1000);

  // Intl.RelativeTimeFormat is not available in all React Native runtimes
  // (e.g. Hermes). Use it when present, otherwise fall back to a simple
  // manual formatter.
  if (
    typeof Intl !== "undefined" &&
    typeof (Intl as Record<string, unknown>).RelativeTimeFormat === "function"
  ) {
    try {
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
    } catch {
      // fall through to manual formatter
    }
  }

  // Manual fallback for runtimes without Intl.RelativeTimeFormat
  const abs = Math.abs(diffSec);
  if (abs < 60) {
    return locale === "ar" ? `منذ ${abs} ثانية` : `${abs}s ago`;
  }
  const mins = Math.round(abs / 60);
  if (mins < 60) {
    return locale === "ar" ? `منذ ${mins} دقيقة` : `${mins}m ago`;
  }
  const hrs = Math.round(mins / 60);
  if (hrs < 24) {
    return locale === "ar" ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
  }
  const days = Math.round(hrs / 24);
  return locale === "ar" ? `منذ ${days} يوم` : `${days}d ago`;
}
