import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";
import { isIpv4Host, pickHighestRisk, type RiskSignal } from "@/lib/utils/riskAnalysis";

const shortenerHosts = new Set([
  "bit.ly",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tinyurl.com",
]);

export function detectUrl(context: DetectorContext): QRInspectionResult | null {
  if (!/^https?:\/\//i.test(context.normalizedPayload)) {
    return null;
  }

  context.pushStep("Matched http:// or https:// prefix.");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(context.normalizedPayload);
  } catch {
    return null;
  }

  const host = parsedUrl.hostname.toLowerCase();
  const normalizedHost = host.replace(/^www\./, "");
  const signals: RiskSignal[] = [];

  if (parsedUrl.protocol === "http:") {
    signals.push({
      severity: "medium",
      note: "This link uses HTTP instead of HTTPS.",
    });
  }

  if (isIpv4Host(normalizedHost)) {
    signals.push({
      severity: "high",
      note: "The link points to a raw IP address instead of a named domain.",
    });
  }

  if (normalizedHost.includes("xn--")) {
    signals.push({
      severity: "medium",
      note: "The domain uses punycode (xn--), which can hide look-alike domains.",
    });
  }

  if (shortenerHosts.has(normalizedHost)) {
    signals.push({
      severity: "medium",
      note: "This domain is a link shortener. The final destination is hidden until it opens.",
    });
  }

  if (normalizedHost.length > 40) {
    signals.push({
      severity: "low",
      note: "The domain is unusually long.",
    });
  }

  if ((normalizedHost.match(/-/g) ?? []).length >= 4) {
    signals.push({
      severity: "medium",
      note: "The domain contains many hyphens, which can be a warning sign.",
    });
  }

  const details: QRInspectionDetail[] = [
    { label: "Normalized URL", value: parsedUrl.toString() },
    { label: "Domain", value: parsedUrl.hostname },
    { label: "Protocol", value: parsedUrl.protocol.replace(":", "").toUpperCase() },
  ];

  if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
    details.push({ label: "Path", value: parsedUrl.pathname });
  }

  const safetyNotes = [
    "This QR contains a website link.",
    ...(signals.length
      ? signals.map((signal) => signal.note)
      : ["No obvious format-level issues detected."]),
  ];

  return {
    detectedType: "Website link",
    scheme: parsedUrl.protocol.replace(":", "").toUpperCase(),
    confidence: "high",
    riskLevel: pickHighestRisk(signals, "low"),
    summary: `This QR contains a website link to ${parsedUrl.hostname}.`,
    details,
    safetyNotes,
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "urlDetector",
      steps: [],
      heuristics: signals.map((signal) => signal.note),
    },
  };
}
