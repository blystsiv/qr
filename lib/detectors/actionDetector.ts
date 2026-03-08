import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9().\-\s]{7,20}$/;

export function detectAction(
  context: DetectorContext,
): QRInspectionResult | null {
  const payload = context.normalizedPayload;

  if (/^mailto:/i.test(payload)) {
    context.pushStep("Matched mailto: prefix.");
    const { address, subject, body } = parseMailto(payload);
    const details: QRInspectionDetail[] = [
      { label: "Email target", value: address || "Not provided" },
    ];

    if (subject) {
      details.push({ label: "Subject", value: subject });
    }

    if (body) {
      details.push({ label: "Body", value: body });
    }

    return {
      detectedType: "Email action",
      scheme: "mailto",
      confidence: "high",
      riskLevel: "low",
      summary: `This QR opens an email draft${
        address ? ` addressed to ${address}` : ""
      }.`,
      details,
      safetyNotes: [
        "This QR opens an email draft, not a website link.",
        "Review the address, subject, and body before sending anything.",
      ],
      rawPayload: context.rawPayload,
      debug: {
        matchedBy: "actionDetector",
        steps: [],
      },
    };
  }

  if (/^tel:/i.test(payload)) {
    context.pushStep("Matched tel: prefix.");
    const number = payload.slice(4).trim();

    return buildPhoneResult(context, {
      scheme: "tel",
      summary: `This QR opens a phone call${
        number ? ` to ${number}` : ""
      }.`,
      details: [{ label: "Phone number", value: number || "Not provided" }],
    });
  }

  if (/^sms:/i.test(payload) || /^smsto:/i.test(payload)) {
    context.pushStep("Matched SMS prefix.");
    const { number, body } = parseSms(payload);
    const details: QRInspectionDetail[] = [
      { label: "Recipient", value: number || "Not provided" },
    ];

    if (body) {
      details.push({ label: "Message body", value: body });
    }

    return {
      detectedType: "Phone or messaging action",
      scheme: "sms",
      confidence: "high",
      riskLevel: "low",
      summary: `This QR opens a text message draft${
        number ? ` to ${number}` : ""
      }.`,
      details,
      safetyNotes: [
        "This QR opens a messaging action, not a website link.",
        "Review the recipient and message before sending anything.",
      ],
      rawPayload: context.rawPayload,
      debug: {
        matchedBy: "actionDetector",
        steps: [],
      },
    };
  }

  if (emailPattern.test(payload)) {
    context.pushStep("Matched plain email address heuristic.");

    return {
      detectedType: "Email action",
      scheme: "plain email",
      confidence: "medium",
      riskLevel: "low",
      summary: `This QR appears to contain an email address for ${payload}.`,
      details: [{ label: "Email target", value: payload }],
      safetyNotes: [
        "This QR appears to contain an email address, not a website link.",
        "Verify the email address before contacting it.",
      ],
      rawPayload: context.rawPayload,
      debug: {
        matchedBy: "actionDetector",
        steps: [],
      },
    };
  }

  if (phonePattern.test(payload)) {
    context.pushStep("Matched plain phone number heuristic.");

    return buildPhoneResult(context, {
      scheme: "plain phone number",
      summary: `This QR appears to contain a phone number${payload ? `: ${payload}` : ""}.`,
      details: [{ label: "Phone number", value: payload }],
      confidence: "medium",
    });
  }

  return null;
}

function parseMailto(payload: string): {
  address: string;
  subject: string;
  body: string;
} {
  const body = payload.slice("mailto:".length);
  const [address, query = ""] = body.split("?", 2);
  const params = new URLSearchParams(query);

  return {
    address,
    subject: params.get("subject") ?? "",
    body: params.get("body") ?? "",
  };
}

function parseSms(payload: string): {
  number: string;
  body: string;
} {
  if (/^smsto:/i.test(payload)) {
    const withoutPrefix = payload.slice("smsto:".length);
    const [number, body = ""] = withoutPrefix.split(":", 2);

    return { number, body };
  }

  const withoutPrefix = payload.slice("sms:".length);
  const [number, query = ""] = withoutPrefix.split("?", 2);
  const params = new URLSearchParams(query);

  return {
    number,
    body: params.get("body") ?? "",
  };
}

function buildPhoneResult(
  context: DetectorContext,
  options: {
    scheme: string;
    summary: string;
    details: QRInspectionDetail[];
    confidence?: "high" | "medium";
  },
): QRInspectionResult {
  return {
    detectedType: "Phone or messaging action",
    scheme: options.scheme,
    confidence: options.confidence ?? "high",
    riskLevel: "low",
    summary: options.summary,
    details: options.details,
    safetyNotes: [
      "This QR contains a phone or messaging action, not a website link.",
      "Double-check the phone number before calling or sending a message.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "actionDetector",
      steps: [],
    },
  };
}
