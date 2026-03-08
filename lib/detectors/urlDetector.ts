import type {
  DetectorContext,
  QRInspectionDetail,
  QRInspectionResult,
  VerdictLevel,
} from "@/lib/types/qr";
import {
  isIpv4Host,
  pickHighestRisk,
  type RiskSignal,
} from "@/lib/utils/riskAnalysis";
import { makeVerdict } from "@/lib/utils/userFacing";

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

const riskyTlds = new Set([
  "click",
  "country",
  "gq",
  "loan",
  "mov",
  "shop",
  "tk",
  "top",
  "work",
  "xyz",
  "zip",
]);

const freeHostingDomains = new Set([
  "firebaseapp.com",
  "github.io",
  "netlify.app",
  "pages.dev",
  "vercel.app",
  "web.app",
  "workers.dev",
]);

const trustedDomainFamilies = [
  { label: "Google", domains: ["google.com", "youtube.com", "gmail.com"] },
  { label: "Microsoft", domains: ["microsoft.com", "office.com", "live.com"] },
  { label: "Apple", domains: ["apple.com"] },
  { label: "Amazon", domains: ["amazon.com"] },
  { label: "GitHub", domains: ["github.com"] },
  { label: "Wikipedia", domains: ["wikipedia.org"] },
  { label: "PayPal", domains: ["paypal.com", "paypal.me"] },
  { label: "OpenAI", domains: ["openai.com"] },
  { label: "LinkedIn", domains: ["linkedin.com"] },
  { label: "Meta", domains: ["facebook.com", "instagram.com", "whatsapp.com"] },
];

const impersonatedBrands = [
  { brand: "paypal", official: ["paypal.com", "paypal.me"] },
  { brand: "google", official: ["google.com", "gmail.com", "youtube.com"] },
  { brand: "apple", official: ["apple.com"] },
  { brand: "microsoft", official: ["microsoft.com", "office.com", "live.com"] },
  { brand: "amazon", official: ["amazon.com"] },
  { brand: "binance", official: ["binance.com"] },
  { brand: "metamask", official: ["metamask.io"] },
  { brand: "openai", official: ["openai.com"] },
  { brand: "revolut", official: ["revolut.com"] },
];

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
  const trustedMatch = matchTrustedDomain(normalizedHost);
  const impersonatedBrand = detectBrandImpersonation(normalizedHost);
  const riskyTld = normalizedHost.split(".").pop() ?? "";

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

  if (freeHostingDomains.has(normalizedHost) || endsWithAny(normalizedHost, freeHostingDomains)) {
    signals.push({
      severity: "medium",
      note: "This link uses a shared hosting domain instead of its own branded domain.",
    });
  }

  if (riskyTlds.has(riskyTld)) {
    signals.push({
      severity: "medium",
      note: `The domain uses the .${riskyTld} top-level domain, which is often used in low-trust campaigns.`,
    });
  }

  if (impersonatedBrand) {
    signals.push({
      severity: "high",
      note: `The domain mentions ${impersonatedBrand} but is not on an official ${impersonatedBrand} domain.`,
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

  if (trustedMatch) {
    details.push({ label: "Known domain", value: `Yes (${trustedMatch})` });
  } else {
    details.push({ label: "Known domain", value: "No" });
  }

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

  const verdict = classifyUrlVerdict({
    signals,
    trustedMatch,
    impersonatedBrand,
  });

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
    plainLanguage: buildPlainLanguage({
      url: parsedUrl.url,
      trustedMatch,
      verdictLevel: verdict.level,
      urlKind: urlKind.detectedType,
    }),
    details,
    safetyNotes,
    recommendedActions: buildRecommendedActions(verdict.level),
    verdict,
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

function classifyUrlVerdict({
  signals,
  trustedMatch,
  impersonatedBrand,
}: {
  signals: RiskSignal[];
  trustedMatch?: string;
  impersonatedBrand?: string;
}) {
  const highSignals = signals.filter((signal) => signal.severity === "high").length;
  const mediumSignals = signals.filter((signal) => signal.severity === "medium").length;

  if (
    impersonatedBrand ||
    highSignals >= 2 ||
    (highSignals >= 1 && mediumSignals >= 1)
  ) {
    return makeVerdict(
      "scam",
      "Likely scam",
      "This link shows strong phishing-style patterns such as impersonation, deceptive hosting, or other high-risk technical signals.",
    );
  }

  if (highSignals >= 1 || mediumSignals >= 2) {
    return makeVerdict(
      "suspicious",
      "Suspicious",
      "This link has some warning signs. It may still be real, but it should not be trusted until the destination is checked.",
    );
  }

  if (trustedMatch) {
    return makeVerdict(
      "safe",
      "Likely safe",
      `This link uses a well-known ${trustedMatch} domain and does not show obvious format-level red flags.`,
    );
  }

  return makeVerdict(
    "safe",
    "Looks safe",
    "This link looks technically normal and does not show obvious format-level red flags, but the app cannot confirm who controls the site.",
  );
}

function buildPlainLanguage({
  url,
  trustedMatch,
  verdictLevel,
  urlKind,
}: {
  url: URL;
  trustedMatch?: string;
  verdictLevel: VerdictLevel;
  urlKind: string;
}) {
  if (verdictLevel === "scam") {
    return `This QR opens a link to ${url.hostname}, but the link has strong scam or phishing-style warning signs. You should treat it as unsafe until proven otherwise.`;
  }

  if (verdictLevel === "suspicious") {
    return `This QR opens a link to ${url.hostname}. The destination may still be legitimate, but the link has enough warning signs that you should verify it before opening or trusting it.`;
  }

  if (urlKind === "Document or file link") {
    return trustedMatch
      ? `This QR opens a document or file link on a well-known ${trustedMatch} domain. It looks normal, but you should still check what the file or document asks you to do.`
      : `This QR opens a document or file link on ${url.hostname}. It looks normal, but you should still verify the sender before downloading or opening anything.`;
  }

  return trustedMatch
    ? `This QR opens a link on a well-known ${trustedMatch} domain. It looks technically normal, but you should still check the page before logging in, paying, or sharing data.`
    : `This QR opens a link to ${url.hostname}. It looks technically normal, but the app cannot confirm who controls the site.`;
}

function buildRecommendedActions(level: VerdictLevel) {
  if (level === "scam") {
    return [
      "Do not open the link unless you can verify it independently.",
      "Do not enter passwords, payment details, or verification codes.",
      "Ask the sender for a different verified link if needed.",
    ];
  }

  if (level === "suspicious") {
    return [
      "Open it only if you trust the sender and expected the link.",
      "Type the official site manually if possible instead of following the QR link.",
      "Do not log in, pay, or download anything until the destination is confirmed.",
    ];
  }

  return [
    "You can open the link if you expected it.",
    "Still check the page before logging in, paying, or downloading anything.",
  ];
}

function matchTrustedDomain(host: string): string | undefined {
  const match = trustedDomainFamilies.find((family) =>
    family.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)),
  );

  return match?.label;
}

function detectBrandImpersonation(host: string): string | undefined {
  const match = impersonatedBrands.find(
    (entry) =>
      host.includes(entry.brand) &&
      !entry.official.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      ),
  );

  return match?.brand;
}

function endsWithAny(host: string, domains: Set<string>): boolean {
  return Array.from(domains).some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}
