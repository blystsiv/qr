import { qrDetectors } from "@/lib/detectors";
import type { QRInspectionResult } from "@/lib/types/qr";

export function classifyQR(payload: string): QRInspectionResult {
  const steps: string[] = [];
  const normalizedPayload = payload.replace(/\r\n/g, "\n").trim();

  if (!normalizedPayload) {
    return {
      detectedType: "Text or unknown format",
      confidence: "low",
      riskLevel: "unknown",
      summary: "Paste, scan, or upload a QR payload to inspect it.",
      details: [{ label: "Status", value: "No payload provided" }],
      safetyNotes: [
        "Add QR content first. The inspector only analyzes payloads that are already decoded or scanned.",
      ],
      rawPayload: payload,
      debug: {
        matchedBy: "emptyPayload",
        steps: ["Input was empty after trimming whitespace."],
      },
    };
  }

  const context = {
    rawPayload: payload,
    normalizedPayload,
    pushStep: (step: string) => steps.push(step),
  };

  steps.push("Normalized line endings and trimmed surrounding whitespace.");

  // Detectors run from most-specific prefixes to broad heuristics so later
  // matches do not override strong earlier matches such as WIFI: or UPI.
  for (const detector of qrDetectors) {
    steps.push(`Trying ${detector.id}.`);
    const result = detector.detect(context);

    if (!result) {
      continue;
    }

    const debug = result.debug ?? {
      matchedBy: detector.id,
      steps: [],
    };

    return {
      ...result,
      rawPayload: payload,
      debug: {
        ...debug,
        matchedBy: debug.matchedBy || detector.id,
        steps: [...steps, ...debug.steps],
      },
    };
  }

  throw new Error("A fallback QR detector must always return a result.");
}
