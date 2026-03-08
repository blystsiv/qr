import type { ConfidenceLevel } from "@/lib/types/qr";

const confidenceOrder: ConfidenceLevel[] = ["low", "medium", "high"];

export function downgradeConfidence(level: ConfidenceLevel): ConfidenceLevel {
  const index = confidenceOrder.indexOf(level);
  return confidenceOrder[Math.max(0, index - 1)];
}

export function confidenceFromHeuristicHits(hitCount: number): ConfidenceLevel {
  if (hitCount >= 3) {
    return "high";
  }

  if (hitCount >= 1) {
    return "medium";
  }

  return "low";
}
