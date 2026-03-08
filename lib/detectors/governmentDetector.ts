import type { DetectorContext, QRInspectionResult } from "@/lib/types/qr";
import { confidenceFromHeuristicHits } from "@/lib/utils/confidence";

const governmentHints = [
  "gov",
  "govt",
  "government",
  "tax",
  "passport",
  "official",
  "authority",
  "identity",
  "id verification",
  "e-government",
  "egov",
  "ministry",
  "license",
];

export function detectGovernmentLikePayload(
  context: DetectorContext,
): QRInspectionResult | null {
  const haystack = context.normalizedPayload.toLowerCase();
  const matchedHints = governmentHints.filter((hint) => haystack.includes(hint));

  if (!matchedHints.length) {
    return null;
  }

  context.pushStep(
    `Matched government-like heuristic markers: ${matchedHints.join(", ")}.`,
  );

  const confidence = matchedHints.length >= 2 ? "medium" : "low";

  return {
    detectedType: "Government / identity / official data (possible)",
    confidence,
    riskLevel: confidenceFromHeuristicHits(matchedHints.length) === "high"
      ? "medium"
      : "unknown",
    summary:
      "This QR may contain government, identity, or official verification data, but this is only a heuristic guess.",
    details: [
      {
        label: "Matched markers",
        value: matchedHints.join(", "),
      },
    ],
    safetyNotes: [
      "This result is heuristic only and not a definitive classification.",
      "Treat any official-looking QR code carefully and verify it with a trusted source.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "governmentDetector",
      steps: [],
      heuristics: matchedHints,
    },
  };
}
