import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";
import { inspectEmvPaymentPayload } from "@/lib/parsers/emvParser";
import { makeVerdict } from "@/lib/utils/userFacing";

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
      plainLanguage:
        emvInspection.crc.present && emvInspection.crc.valid
          ? `This is a payment QR code${
              emvInspection.details.find((detail) => detail.label === "Merchant name")
                ? ` for ${
                    emvInspection.details.find(
                      (detail) => detail.label === "Merchant name",
                    )?.value
                  }`
                : ""
            }. The payment format looks technically valid, but that does not prove the person asking for payment is trustworthy.`
          : "This is a payment QR code, but it has structural warning signs. Do not pay unless you can verify the request another way.",
      details: emvInspection.details,
      safetyNotes: emvInspection.safetyNotes,
      recommendedActions:
        emvInspection.crc.present && emvInspection.crc.valid
          ? [
              "Check the merchant name carefully.",
              "Confirm the amount before approving payment.",
              "Only continue if you expected this payment request.",
            ]
          : [
              "Do not pay until the merchant and amount are verified independently.",
              "Ask the sender for another verified payment method if needed.",
            ],
      verdict:
        emvInspection.crc.present && !emvInspection.crc.valid
          ? makeVerdict(
              "suspicious",
              "Payment needs extra caution",
              "The payment QR failed a structural validation check. That does not prove a scam, but it is a strong reason to stop and verify it first.",
            )
          : makeVerdict(
              "needs-verification",
              "Payment needs verification",
              "The payment code may be technically valid, but that does not prove the payment request itself is honest.",
            ),
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
    plainLanguage: `This is a UPI payment request${
      payeeName ? ` for ${payeeName}` : ""
    }. That means a payment app can use this QR to prepare a transfer. It does not prove the person asking for money is trustworthy.`,
    details,
    safetyNotes: [
      "This QR contains payment information, not a website link.",
      "Verify merchant name, amount, and source before proceeding.",
    ],
    recommendedActions: [
      "Check the payee name and UPI address.",
      "Confirm the amount before approving payment.",
      "Only continue if you expected this request.",
    ],
    verdict: makeVerdict(
      "needs-verification",
      "Payment needs verification",
      "The QR format looks valid for UPI, but that does not confirm who is receiving the money or whether the request is genuine.",
    ),
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
    plainLanguage: `This QR appears to open a PayPal payment${
      handle ? ` for ${handle}` : ""
    }. That does not confirm whether the payment request is legitimate, so verify the recipient before paying.`,
    details,
    safetyNotes: [
      "This QR contains payment information, not a website link.",
      "Verify the PayPal target, amount, and source before proceeding.",
    ],
    recommendedActions: [
      "Check the PayPal target before paying.",
      "Confirm the amount in the payment app.",
      "Only continue if the payment request was expected.",
    ],
    verdict: makeVerdict(
      "needs-verification",
      "Payment needs verification",
      "This looks like a valid PayPal payment link, but it does not prove the recipient is trustworthy.",
    ),
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "paymentDetector",
      steps: [],
      heuristics: [`Matched ${scheme} payment pattern.`],
    },
  };
}
