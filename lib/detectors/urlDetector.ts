import type {
  DetectorContext,
  QRInspectionDetail,
  QRInspectionResult,
} from "@/lib/types/qr";
import {
  isIpv4Host,
  pickHighestRisk,
  type RiskSignal,
} from "@/lib/utils/riskAnalysis";

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

const documentFileExtensions = new Set([
  "csv",
  "doc",
  "docx",
  "jpeg",
  "jpg",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "rtf",
  "txt",
  "xls",
  "xlsx",
  "zip",
]);

const mapHosts = new Set([
  "maps.apple.com",
  "maps.app.goo.gl",
  "maps.google.com",
  "www.google.com",
]);

const documentHosts = new Set([
  "docs.google.com",
  "drive.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "onedrive.live.com",
]);

const appStoreHosts = new Set(["apps.apple.com", "play.google.com"]);

const urlLikePattern =
  /^(?:(?:www\.)?[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:[/?#][^\s]*)?$/;

export function detectUrl(context: DetectorContext): QRInspectionResult | null {
  const parsedUrl = parseUrlLikePayload(context.normalizedPayload);
  if (!parsedUrl) {
    return null;
  }

  context.pushStep(
    parsedUrl.assumedHttps
      ? "Matched domain-like URL without an explicit scheme."
      : "Matched http:// or https:// prefix.",
  );

  const host = parsedUrl.url.hostname.toLowerCase();
  const normalizedHost = host.replace(/^www\./, "");
  const signals: RiskSignal[] = [];
  const urlKind = classifyUrlKind(parsedUrl.url);
  const suspiciousKeywords = extractSuspiciousKeywords(parsedUrl.url);

  if (parsedUrl.url.protocol === "http:") {
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

  if (parsedUrl.url.username || parsedUrl.url.password) {
    signals.push({
      severity: "high",
      note: "This URL includes embedded login information before the domain.",
    });
  }

  if (normalizedHost.split(".").length >= 5) {
    signals.push({
      severity: "medium",
      note: "The hostname contains many subdomains, which can be a warning sign.",
    });
  }

  if (parsedUrl.url.searchParams.size >= 8) {
    signals.push({
      severity: "low",
      note: "This URL has a large number of query parameters.",
    });
  }

  if (suspiciousKeywords.length) {
    signals.push({
      severity: "medium",
      note: `The link contains sensitive-looking keywords: ${suspiciousKeywords.join(", ")}.`,
    });
  }

  const details: QRInspectionDetail[] = [
    { label: "Normalized URL", value: parsedUrl.url.toString() },
    { label: "Domain", value: parsedUrl.url.hostname },
    {
      label: "Protocol",
      value: parsedUrl.url.protocol.replace(":", "").toUpperCase(),
    },
    { label: "Link kind", value: urlKind.label },
  ];

  if (parsedUrl.assumedHttps) {
    details.push({
      label: "Normalization",
      value: "Assumed HTTPS for bare domain",
    });
  }

  if (parsedUrl.url.pathname && parsedUrl.url.pathname !== "/") {
    details.push({ label: "Path", value: parsedUrl.url.pathname });
  }

  if (urlKind.provider) {
    details.push({ label: "Provider", value: urlKind.provider });
  }

  if (parsedUrl.url.searchParams.size > 0) {
    details.push({
      label: "Query params",
      value: `${parsedUrl.url.searchParams.size}`,
    });
  }

  const safetyNotes = [
    urlKind.note,
    ...(signals.length
      ? signals.map((signal) => signal.note)
      : ["No obvious format-level issues detected."]),
  ];

  return {
    detectedType: urlKind.detectedType,
    scheme: parsedUrl.url.protocol.replace(":", "").toUpperCase(),
    confidence: "high",
    riskLevel: pickHighestRisk(signals, "low"),
    summary: buildUrlSummary(parsedUrl.url, urlKind),
    details,
    safetyNotes,
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "urlDetector",
      steps: [],
      heuristics: [
        `URL subtype: ${urlKind.label}`,
        ...signals.map((signal) => signal.note),
      ],
    },
  };
}

function parseUrlLikePayload(
  payload: string,
): { url: URL; assumedHttps: boolean } | null {
  try {
    if (/^https?:\/\//i.test(payload)) {
      return {
        url: new URL(payload),
        assumedHttps: false,
      };
    }

    if (!urlLikePattern.test(payload)) {
      return null;
    }

    return {
      url: new URL(`https://${payload}`),
      assumedHttps: true,
    };
  } catch {
    return null;
  }
}

function classifyUrlKind(url: URL): {
  detectedType: string;
  label: string;
  note: string;
  provider?: string;
} {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const extension = path.includes(".") ? path.split(".").pop() ?? "" : "";

  if (documentHosts.has(host)) {
    return {
      detectedType: "Document or file link",
      label: "Cloud document or share link",
      note: "This QR contains a document or file-sharing link.",
      provider: host,
    };
  }

  if (documentFileExtensions.has(extension)) {
    return {
      detectedType: "Document or file link",
      label: `${extension.toUpperCase()} file link`,
      note: "This QR points to a document or file rather than a general webpage.",
    };
  }

  if (
    mapHosts.has(host) &&
    (path.includes("/maps") ||
      path.includes("/place") ||
      path.includes("/search") ||
      url.searchParams.has("q") ||
      url.searchParams.has("ll"))
  ) {
    return {
      detectedType: "Location link",
      label: "Map or navigation link",
      note: "This QR contains a map or navigation link.",
      provider: host,
    };
  }

  if (appStoreHosts.has(host)) {
    return {
      detectedType: "App store link",
      label: "App install or app listing link",
      note: "This QR points to an app store listing.",
      provider: host,
    };
  }

  return {
    detectedType: "Website link",
    label: "Website",
    note: "This QR contains a website link.",
  };
}

function extractSuspiciousKeywords(url: URL): string[] {
  const haystack = `${url.hostname}${url.pathname}`.toLowerCase();
  const keywords = [
    "account",
    "auth",
    "bank",
    "login",
    "secure",
    "update",
    "verify",
    "wallet",
  ];

  return keywords.filter((keyword) => haystack.includes(keyword));
}

function buildUrlSummary(
  url: URL,
  urlKind: {
    detectedType: string;
  },
): string {
  if (urlKind.detectedType === "Document or file link") {
    return `This QR points to a document or file link on ${url.hostname}.`;
  }

  if (urlKind.detectedType === "Location link") {
    return `This QR points to a map or navigation link on ${url.hostname}.`;
  }

  if (urlKind.detectedType === "App store link") {
    return `This QR points to an app store listing on ${url.hostname}.`;
  }

  return `This QR contains a website link to ${url.hostname}.`;
}
