import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";

export function detectLocation(
  context: DetectorContext,
): QRInspectionResult | null {
  const payload = context.normalizedPayload;

  if (!/^geo:/i.test(payload)) {
    return null;
  }

  context.pushStep("Matched geo: prefix.");
  const details = parseGeoPayload(payload);

  return {
    detectedType: "Location link",
    scheme: "geo",
    confidence: "high",
    riskLevel: "low",
    summary:
      "This QR contains a location link that can open a map or navigation app.",
    details,
    safetyNotes: [
      "This QR contains a location or map action, not a website link.",
      "Check the coordinates or label before navigating somewhere unfamiliar.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "locationDetector",
      steps: [],
    },
  };
}

function parseGeoPayload(payload: string): QRInspectionDetail[] {
  const value = payload.slice(4);
  const [coordinates, query = ""] = value.split("?", 2);
  const [latitude = "", longitude = ""] = coordinates.split(",", 2);
  const details: QRInspectionDetail[] = [];

  if (latitude || longitude) {
    details.push({
      label: "Coordinates",
      value: [latitude, longitude].filter(Boolean).join(", "),
    });
  }

  const params = new URLSearchParams(query);
  const label = params.get("q") ?? params.get("label");
  if (label) {
    details.push({ label: "Label", value: label });
  }

  return details;
}
