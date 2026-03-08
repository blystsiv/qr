import type { RiskLevel } from "@/lib/types/qr";

export type RiskSignal = {
  severity: Exclude<RiskLevel, "unknown">;
  note: string;
};

const riskPriority: Record<Exclude<RiskLevel, "unknown">, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function pickHighestRisk(
  signals: RiskSignal[],
  fallback: RiskLevel = "unknown",
): RiskLevel {
  if (!signals.length) {
    return fallback;
  }

  return signals.reduce<Exclude<RiskLevel, "unknown">>((highest, current) => {
    return riskPriority[current.severity] > riskPriority[highest]
      ? current.severity
      : highest;
  }, "low");
}

export function maskSensitiveValue(value?: string | null): string {
  if (!value) {
    return "Not provided";
  }

  return `${"•".repeat(Math.min(8, value.length))} (${value.length} chars)`;
}

export function isIpv4Host(host: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
}
