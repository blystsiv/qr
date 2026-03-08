import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";
import { inspectEmvPaymentPayload } from "@/lib/parsers/emvParser";

const paypalHosts = new Set(["paypal.me", "paypal.com", "www.paypal.com"]);

export function detectPayment(
  context: DetectorContext,
): QRInspectionResult | null {
  const payload = context.normalizedPayload;

  if (/^upi:\/\//i.test(payload)) {
    context.pushStep("Matched upi:// prefix.");
    return parseUpiPayment(context, payload);
  }

  if (/^paypal:\/\//i.test(payload)) {
    context.pushStep("Matched paypal:// prefix.");
    return buildPayPalResult(context, payload, "paypal://");
  }

  if (/^https?:\/\//i.test(payload)) {
    try {
      const url = new URL(payload);
      if (paypalHosts.has(url.hostname.toLowerCase())) {
        context.pushStep("Matched PayPal website heuristic.");
        return buildPayPalResult(context, payload, "paypal");
      }
    } catch {
      // Let later detectors handle malformed URLs.
    }
  }

  const emvInspection = inspectEmvPaymentPayload(payload);
  if (emvInspection) {
    context.pushStep("Matched EMV-style TLV payment structure.");

    return {
      detectedType: "Payment QR",
      scheme: emvInspection.scheme,
      confidence: emvInspection.confidence,
      riskLevel: emvInspection.riskLevel,
      summary: emvInspection.summary,
      details: emvInspection.details,
      safetyNotes: emvInspection.safetyNotes,
      rawPayload: context.rawPayload,
      debug: {
        matchedBy: "paymentDetector",
        steps: [],
        topLevelTags: emvInspection.topLevelTags,
        nestedTags: emvInspection.nestedTags,
        crc: emvInspection.crc,
      },
    };
  }

  return null;
}

function parseUpiPayment(
  context: DetectorContext,
  payload: string,
): QRInspectionResult {
  const url = new URL(payload);
  const details: QRInspectionDetail[] = [];
  const paymentAddress = url.searchParams.get("pa") ?? "";
  const payeeName = url.searchParams.get("pn") ?? "";
  const amount = url.searchParams.get("am") ?? "";
  const currency = url.searchParams.get("cu") ?? "INR";
  const note = url.searchParams.get("tn") ?? "";

  if (payeeName) {
    details.push({ label: "Merchant name", value: payeeName });
  }

  if (paymentAddress) {
    details.push({ label: "Payment address", value: paymentAddress });
  }

  if (amount) {
    details.push({ label: "Amount", value: amount });
  }

  if (currency) {
    details.push({ label: "Currency", value: currency });
  }

  if (note) {
    details.push({ label: "Reference / note", value: note });
  }

  return {
    detectedType: "Payment QR",
    scheme: "UPI",
    confidence: "high",
    riskLevel: "medium",
    summary: `This QR contains a UPI payment request${
      payeeName ? ` for ${payeeName}` : ""
    }.`,
    details,
    safetyNotes: [
      "This QR contains payment information, not a website link.",
      "Verify merchant name, amount, and source before proceeding.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "paymentDetector",
      steps: [],
    },
  };
}

function buildPayPalResult(
  context: DetectorContext,
  payload: string,
  scheme: string,
): QRInspectionResult {
  const url = new URL(payload.replace(/^paypal:\/\//i, "https://paypal.com/"));
  const pathParts = url.pathname.split("/").filter(Boolean);
  const details: QRInspectionDetail[] = [];
  const handle = pathParts[0] ?? "";
  const amount = pathParts[1] ?? url.searchParams.get("amount") ?? "";

  if (handle) {
    details.push({ label: "PayPal target", value: handle });
  }

  if (amount) {
    details.push({ label: "Amount", value: amount });
  }

  details.push({ label: "Normalized link", value: url.toString() });

  return {
    detectedType: "Payment QR",
    scheme: "PayPal",
    confidence: "high",
    riskLevel: "medium",
    summary: `This QR appears to open a PayPal payment${
      handle ? ` for ${handle}` : ""
    }.`,
    details,
    safetyNotes: [
      "This QR contains payment information, not a website link.",
      "Verify the PayPal target, amount, and source before proceeding.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "paymentDetector",
      steps: [],
      heuristics: [`Matched ${scheme} payment pattern.`],
    },
  };
}
