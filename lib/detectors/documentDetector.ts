import type {
  ConfidenceLevel,
  DetectorContext,
  QRInspectionDetail,
  QRInspectionResult,
  RiskLevel,
} from "@/lib/types/qr";

const documentHints = new Set([
  "authority",
  "credential",
  "credentialsubject",
  "doctype",
  "document",
  "documentnumber",
  "documenttype",
  "expirydate",
  "expirationdate",
  "id",
  "idnumber",
  "issuer",
  "license",
  "nationalid",
  "passport",
  "signature",
  "signed",
  "verification",
]);

export function detectDocumentLikePayload(
  context: DetectorContext,
): QRInspectionResult | null {
  const jsonMatch = inspectJsonPayload(context.normalizedPayload);
  if (jsonMatch) {
    context.pushStep("Matched JSON-based document or verification data.");
    return buildDocumentResult(context, jsonMatch);
  }

  const jwtMatch = inspectJwtPayload(context.normalizedPayload);
  if (jwtMatch) {
    context.pushStep("Matched JWT-like verification token.");
    return buildDocumentResult(context, jwtMatch);
  }

  return null;
}

function inspectJsonPayload(payload: string): DocumentInspection | null {
  const firstCharacter = payload.trim().charAt(0);
  if (firstCharacter !== "{") {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const object = parsed as Record<string, unknown>;
    const keys = Object.keys(object);
    const matchedKeys = keys.filter((key) =>
      documentHints.has(normalizeKey(key)),
    );

    if (!matchedKeys.length) {
      return null;
    }

    return {
      detectedType: "Document / verification data (possible)",
      scheme: "JSON",
      confidence: matchedKeys.length >= 3 ? "high" : "medium",
      riskLevel: "unknown",
      summary:
        "This QR appears to contain structured document or verification data rather than a normal website link.",
      details: buildJsonDetails(object, matchedKeys, keys),
      safetyNotes: [
        "This QR appears to contain structured document or verification data, not a website link.",
        "Treat personal or official data carefully and verify the source before sharing or importing it.",
      ],
      heuristics: matchedKeys.map((key) => `Matched JSON key: ${key}`),
    };
  } catch {
    return null;
  }
}

function inspectJwtPayload(payload: string): DocumentInspection | null {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(payload)) {
    return null;
  }

  try {
    const [headerSegment, bodySegment] = payload.split(".");
    const header = parseBase64UrlJson(headerSegment);
    const body = parseBase64UrlJson(bodySegment);

    if (!header || !body) {
      return null;
    }

    const matchedKeys = Object.keys(body).filter((key) =>
      ["iss", "sub", "exp", "nbf", "aud", "vc", "credentialSubject"].includes(
        key,
      ),
    );

    if (!matchedKeys.length) {
      return null;
    }

    const details: QRInspectionDetail[] = [
      {
        label: "Token type",
        value: stringOrFallback(header.typ) || stringOrFallback(header.alg) || "JWT",
      },
    ];

    if (typeof body.iss === "string") {
      details.push({ label: "Issuer", value: body.iss });
    }

    if (typeof body.sub === "string") {
      details.push({ label: "Subject", value: body.sub });
    }

    if (typeof body.exp === "number") {
      details.push({
        label: "Expires",
        value: new Date(body.exp * 1000).toISOString(),
      });
    }

    const vcType = extractCredentialType(body.vc);
    if (vcType) {
      details.push({ label: "Credential type", value: vcType });
    }

    return {
      detectedType: "Signed token / verification data",
      scheme: "JWT",
      confidence: "high",
      riskLevel: "unknown",
      summary:
        "This QR appears to contain a signed token or verification payload rather than a normal website link.",
      details,
      safetyNotes: [
        "This QR appears to contain signed verification data, not a website link.",
        "Verification tokens can contain sensitive claims or identifiers. Inspect the issuer carefully.",
      ],
      heuristics: matchedKeys.map((key) => `Matched token claim: ${key}`),
    };
  } catch {
    return null;
  }
}

function buildDocumentResult(
  context: DetectorContext,
  inspection: DocumentInspection,
): QRInspectionResult {
  return {
    detectedType: inspection.detectedType,
    scheme: inspection.scheme,
    confidence: inspection.confidence,
    riskLevel: inspection.riskLevel,
    summary: inspection.summary,
    details: inspection.details,
    safetyNotes: inspection.safetyNotes,
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "documentDetector",
      steps: [],
      heuristics: inspection.heuristics,
    },
  };
}

function buildJsonDetails(
  object: Record<string, unknown>,
  matchedKeys: string[],
  keys: string[],
): QRInspectionDetail[] {
  const details: QRInspectionDetail[] = [
    { label: "Matched markers", value: matchedKeys.join(", ") },
    { label: "Top-level keys", value: keys.slice(0, 8).join(", ") },
  ];

  const issuer = findStringValue(object, ["issuer", "iss", "authority"]);
  if (issuer) {
    details.push({ label: "Issuer / authority", value: issuer });
  }

  const type = findStringValue(object, ["documentType", "docType", "type"]);
  if (type) {
    details.push({ label: "Type", value: type });
  }

  const identifier = findStringValue(object, [
    "documentNumber",
    "idNumber",
    "passport",
    "license",
    "nationalId",
  ]);
  if (identifier) {
    details.push({ label: "Identifier", value: maskIdentifier(identifier) });
  }

  const expiry = findStringValue(object, ["expiryDate", "expirationDate"]);
  if (expiry) {
    details.push({ label: "Expires", value: expiry });
  }

  return details;
}

function parseBase64UrlJson(segment: string): Record<string, unknown> | null {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const suffix = "=".repeat((4 - (padded.length % 4 || 4)) % 4);
  const decoded = atob(`${padded}${suffix}`);
  const parsed = JSON.parse(decoded) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

function findStringValue(
  object: Record<string, unknown>,
  candidates: string[],
): string | undefined {
  for (const candidate of candidates) {
    const value = object[candidate];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function extractCredentialType(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const type = (value as Record<string, unknown>).type;
  if (Array.isArray(type)) {
    return type.join(", ");
  }

  if (typeof type === "string") {
    return type;
  }

  return undefined;
}

function maskIdentifier(value: string): string {
  if (value.length <= 6) {
    return value;
  }

  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

function stringOrFallback(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, "");
}

type DocumentInspection = {
  detectedType: string;
  scheme: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  summary: string;
  details: QRInspectionDetail[];
  safetyNotes: string[];
  heuristics: string[];
};
