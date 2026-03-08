import type { DetectorContext, QRInspectionResult } from "@/lib/types/qr";

export function detectTextOrUnknown(
  context: DetectorContext,
): QRInspectionResult {
  context.pushStep("Fell back to text/unknown classification.");

  return {
    detectedType: "Text or unknown format",
    confidence: "low",
    riskLevel: "unknown",
    summary:
      "This QR does not appear to be a website link. It may contain instructions, identifiers, or app-specific data.",
    details: [
      {
        label: "Payload length",
        value: `${context.normalizedPayload.length} characters`,
      },
    ],
    safetyNotes: [
      "This QR does not appear to be a website link.",
      "It may contain app-specific or structured data that this prototype does not recognize yet.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "textDetector",
      steps: [],
    },
  };
}
