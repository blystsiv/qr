import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";

export function detectContact(
  context: DetectorContext,
): QRInspectionResult | null {
  const payload = context.normalizedPayload;

  if (/^BEGIN:VCARD/i.test(payload)) {
    context.pushStep("Matched BEGIN:VCARD marker.");
    const details = parseVCard(payload);

    return buildContactResult({
      context,
      scheme: "vCard",
      name: details.name,
      phone: details.phone,
      email: details.email,
      organization: details.organization,
    });
  }

  if (/^MECARD:/i.test(payload)) {
    context.pushStep("Matched MECARD: prefix.");
    const details = parseMeCard(payload);

    return buildContactResult({
      context,
      scheme: "MECARD",
      name: details.name,
      phone: details.phone,
      email: details.email,
      organization: details.organization,
    });
  }

  return null;
}

function buildContactResult({
  context,
  scheme,
  name,
  phone,
  email,
  organization,
}: {
  context: DetectorContext;
  scheme: string;
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
}): QRInspectionResult {
  const details: QRInspectionDetail[] = [];

  if (name) {
    details.push({ label: "Name", value: name });
  }

  if (phone) {
    details.push({ label: "Phone", value: phone });
  }

  if (email) {
    details.push({ label: "Email", value: email });
  }

  if (organization) {
    details.push({ label: "Organization", value: organization });
  }

  return {
    detectedType: "Contact card",
    scheme,
    confidence: "high",
    riskLevel: "low",
    summary: `This QR contains contact details${
      name ? ` for ${name}` : ""
    }.`,
    details,
    safetyNotes: [
      "This QR contains contact information, not a website link.",
      "Verify the source before importing the contact into your address book.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "contactDetector",
      steps: [],
    },
  };
}

function parseVCard(payload: string): {
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
} {
  const lines = payload.replace(/\r\n/g, "\n").split("\n");
  const values = new Map<string, string[]>();

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const rawKey = line.slice(0, separatorIndex).split(";")[0].toUpperCase();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!rawValue) {
      continue;
    }

    values.set(rawKey, [...(values.get(rawKey) ?? []), rawValue]);
  }

  return {
    name: values.get("FN")?.[0] ?? formatStructuredName(values.get("N")?.[0]),
    phone: values.get("TEL")?.[0],
    email: values.get("EMAIL")?.[0],
    organization: values.get("ORG")?.[0],
  };
}

function parseMeCard(payload: string): {
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
} {
  const body = payload.slice("MECARD:".length);
  const values = new Map<string, string>();

  for (const segment of splitEscapedSegments(body)) {
    if (!segment) {
      continue;
    }

    const separatorIndex = segment.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = segment.slice(0, separatorIndex).toUpperCase();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }

    values.set(key, value.replace(/\\([\\;,:"])/g, "$1"));
  }

  return {
    name: formatStructuredName(values.get("N")),
    phone: values.get("TEL"),
    email: values.get("EMAIL"),
    organization: values.get("ORG"),
  };
}

function formatStructuredName(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(";")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function splitEscapedSegments(input: string): string[] {
  const segments: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of input) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === ";") {
      segments.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}
