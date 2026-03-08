import type {
  ConfidenceLevel,
  QRInspectionDetail,
  RiskLevel,
} from "@/lib/types/qr";
import type { CRCValidationResult, TLVNode } from "@/lib/types/tlv";
import { parseTlv, tryParseNestedTlv } from "@/lib/parsers/tlvParser";
import { downgradeConfidence } from "@/lib/utils/confidence";

const EMV_TAG_LABELS: Record<string, string> = {
  "00": "Payload format indicator",
  "01": "Point of initiation method",
  "52": "Merchant category code",
  "53": "Transaction currency",
  "54": "Transaction amount",
  "58": "Country code",
  "59": "Merchant name",
  "60": "Merchant city",
  "61": "Postal code",
  "62": "Additional data field template",
  "63": "CRC",
  "64": "Merchant information language template",
};

const ADDITIONAL_DATA_LABELS: Record<string, string> = {
  "01": "Bill number",
  "02": "Mobile number",
  "03": "Store label",
  "04": "Loyalty number",
  "05": "Reference label",
  "06": "Customer label",
  "07": "Terminal label",
  "08": "Purpose of transaction",
  "09": "Additional consumer data request",
};

const LANGUAGE_TEMPLATE_LABELS: Record<string, string> = {
  "00": "Language preference",
  "01": "Localized merchant name",
  "02": "Localized merchant city",
};

const CURRENCY_CODES: Record<string, string> = {
  "356": "INR",
  "360": "IDR",
  "702": "SGD",
  "826": "GBP",
  "840": "USD",
  "978": "EUR",
};

const nestedTopLevelTags = new Set([
  ...Array.from({ length: 26 }, (_, index) =>
    (26 + index).toString().padStart(2, "0"),
  ),
  "62",
  "64",
]);

export type EmvInspection = {
  scheme: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  summary: string;
  details: QRInspectionDetail[];
  safetyNotes: string[];
  topLevelTags: TLVNode[];
  nestedTags: Record<string, TLVNode[]>;
  crc: CRCValidationResult;
  providerMarkers: string[];
};

export function inspectEmvPaymentPayload(payload: string): EmvInspection | null {
  const parsed = parseTlv(payload);
  if (!parsed.complete || parsed.nodes.length < 3) {
    return null;
  }

  const payloadFormatIndicator = parsed.nodes.find((node) => node.tag === "00");
  if (payloadFormatIndicator?.value !== "01") {
    return null;
  }

  const nestedTags: Record<string, TLVNode[]> = {};
  const topLevelTags = parsed.nodes.map((node) => {
    const label = labelTopLevelTag(node.tag);

    if (!nestedTopLevelTags.has(node.tag)) {
      return { ...node, label };
    }

    const nested = tryParseNestedTlv(node.value);
    if (!nested?.nodes.length) {
      return { ...node, label };
    }

    const children = nested.nodes.map((child) => ({
      ...child,
      label: labelNestedTag(node.tag, child.tag),
    }));

    nestedTags[node.tag] = children;

    return {
      ...node,
      label,
      children,
    };
  });

  const crc = validateEmvCrc(payload, parsed.nodes);
  const merchantName = getTagValue(topLevelTags, "59");
  const amount = getTagValue(topLevelTags, "54");
  const currency = formatCurrencyCode(getTagValue(topLevelTags, "53"));
  const country = getTagValue(topLevelTags, "58");
  const city = getTagValue(topLevelTags, "60");
  const providerMarkers = extractProviderMarkers(topLevelTags, nestedTags);
  const scheme = identifyEmvScheme(payload, providerMarkers);
  const reference = collectReferenceValue(nestedTags);

  const details: QRInspectionDetail[] = [];

  if (merchantName) {
    details.push({ label: "Merchant name", value: merchantName });
  }

  if (amount) {
    details.push({ label: "Amount", value: amount });
  }

  if (currency) {
    details.push({ label: "Currency", value: currency });
  }

  if (country) {
    details.push({ label: "Country", value: country });
  }

  if (city) {
    details.push({ label: "City", value: city });
  }

  if (providerMarkers.length) {
    details.push({
      label: "Provider markers",
      value: providerMarkers.join(", "),
    });
  }

  if (reference) {
    details.push({ label: "Reference", value: reference });
  }

  details.push({
    label: "CRC valid",
    value: crc.valid ? "Yes" : crc.present ? "No" : "Not present",
  });

  const safetyNotes = [
    "This QR contains payment information, not a website link.",
    "Verify merchant name, amount, and source before proceeding.",
  ];

  let riskLevel: RiskLevel = "medium";
  let confidence: ConfidenceLevel = crc.present ? "high" : "medium";

  if (crc.present && !crc.valid) {
    riskLevel = "high";
    confidence = "medium";
    safetyNotes.push(
      "The EMV CRC check failed, which suggests corruption or tampering.",
    );
  } else if (crc.present && crc.valid) {
    safetyNotes.push("The EMV CRC check passed.");
  } else {
    safetyNotes.push(
      "No CRC tag was present, so the payload could not be validated end-to-end.",
    );
  }

  if (!amount) {
    safetyNotes.push(
      "No fixed amount was embedded. The receiving app may ask for the amount later.",
    );
  }

  if (!merchantName) {
    confidence = downgradeConfidence(confidence);
  }

  const summary = buildSummary({
    scheme,
    merchantName,
    city,
  });

  return {
    scheme,
    confidence,
    riskLevel,
    summary,
    details,
    safetyNotes,
    topLevelTags,
    nestedTags,
    crc,
    providerMarkers,
  };
}

function labelTopLevelTag(tag: string): string {
  const tagNumber = Number(tag);
  if (tagNumber >= 26 && tagNumber <= 51) {
    return `Merchant account information (${tag})`;
  }

  return EMV_TAG_LABELS[tag] ?? `Unmapped EMV tag (${tag})`;
}

function labelNestedTag(parentTag: string, tag: string): string {
  if (parentTag === "62") {
    return ADDITIONAL_DATA_LABELS[tag] ?? `Additional data field (${tag})`;
  }

  if (parentTag === "64") {
    return LANGUAGE_TEMPLATE_LABELS[tag] ?? `Language template field (${tag})`;
  }

  return {
    "00": "Globally unique identifier",
    "01": "Primary account / reference",
    "02": "Secondary account / reference",
  }[tag] ?? `Merchant account field (${tag})`;
}

function getTagValue(nodes: TLVNode[], tag: string): string | undefined {
  return nodes.find((node) => node.tag === tag)?.value;
}

function formatCurrencyCode(code?: string): string | undefined {
  if (!code) {
    return undefined;
  }

  const currency = CURRENCY_CODES[code];
  return currency ? `${code} (${currency})` : code;
}

function extractProviderMarkers(
  topLevelTags: TLVNode[],
  nestedTags: Record<string, TLVNode[]>,
): string[] {
  const markers = new Set<string>();

  for (const node of topLevelTags) {
    const tagNumber = Number(node.tag);
    if (tagNumber < 26 || tagNumber > 51) {
      continue;
    }

    const children = nestedTags[node.tag] ?? [];
    for (const child of children) {
      if (/[A-Za-z]{3,}|\./.test(child.value)) {
        markers.add(child.value);
      }
    }
  }

  return Array.from(markers).slice(0, 5);
}

function collectReferenceValue(
  nestedTags: Record<string, TLVNode[]>,
): string | undefined {
  const additionalFields = nestedTags["62"] ?? [];
  const referenceField = additionalFields.find((node) =>
    ["01", "03", "05", "07", "08"].includes(node.tag),
  );

  return referenceField?.value;
}

function identifyEmvScheme(
  payload: string,
  providerMarkers: string[],
): string {
  const haystack = [payload, ...providerMarkers].join(" ").toUpperCase();

  if (haystack.includes("QRIS")) {
    return "QRIS";
  }

  return "EMV-compatible payment";
}

function buildSummary({
  scheme,
  merchantName,
  city,
}: {
  scheme: string;
  merchantName?: string;
  city?: string;
}): string {
  const readableScheme =
    scheme === "EMV-compatible payment" ? "structured payment" : scheme;
  const merchantText = merchantName ? ` for ${merchantName}` : "";
  const cityText = city ? ` in ${city}` : "";

  return `This QR contains a ${readableScheme} request${merchantText}${cityText}.`;
}

function validateEmvCrc(
  payload: string,
  nodes: TLVNode[],
): CRCValidationResult {
  const crcNode = nodes.find((node) => node.tag === "63");

  if (!crcNode) {
    return {
      present: false,
      message: "CRC tag 63 was not present.",
    };
  }

  const expected = crcNode.value.toUpperCase();
  if (crcNode.length !== 4 || !/^[0-9A-F]{4}$/i.test(expected)) {
    return {
      present: true,
      expected,
      valid: false,
      message: "CRC tag 63 was present but not a 4-character hex value.",
    };
  }

  // EMV QR CRC covers the whole payload up to and including the CRC tag and
  // length ("6304"), but excludes the 4-character CRC value itself.
  const inputForCalculation = payload.slice(0, crcNode.valueStart);
  const calculated = crc16CcittFalse(inputForCalculation)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");

  return {
    present: true,
    expected,
    calculated,
    valid: calculated === expected,
    message:
      calculated === expected ? "CRC matched." : "CRC mismatch detected.",
  };
}

function crc16CcittFalse(input: string): number {
  let crc = 0xffff;

  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc;
}
