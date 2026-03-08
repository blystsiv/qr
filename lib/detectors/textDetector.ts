import type { DetectorContext, QRInspectionResult } from "@/lib/types/qr";

export function detectTextOrUnknown(
  context: DetectorContext,
): QRInspectionResult {
  const structuredText = inspectStructuredText(context.normalizedPayload);

  if (structuredText) {
    context.pushStep("Matched structured key/value text heuristic.");

    return {
      detectedType: "Structured text or app-specific data",
      confidence: "medium",
      riskLevel: "unknown",
      summary:
        "This QR appears to contain structured text or app-specific fields rather than a normal website link.",
      details: structuredText,
      safetyNotes: [
        "This QR does not appear to be a website link.",
        "It looks like structured app data. Review the fields before using it in another app.",
      ],
      rawPayload: context.rawPayload,
      debug: {
        matchedBy: "textDetector",
        steps: [],
      },
    };
  }

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

function inspectStructuredText(payload: string) {
  const segments = payload.includes("|")
    ? payload.split("|")
    : payload.includes(";")
      ? payload.split(";")
      : [];

  const pairs = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();

      if (!key || !value) {
        return null;
      }

      return { label: key, value };
    })
    .filter((item): item is { label: string; value: string } => item !== null);

  if (pairs.length < 2) {
    return null;
  }

  return pairs.slice(0, 8);
}
