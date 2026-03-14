import type { QRInspectionResult, VerdictLevel } from "@/lib/types/qr";

type PreviewTone = "safe" | "suspicious" | "danger" | "neutral";

type PreviewCardProps = {
  result: QRInspectionResult;
  tone: PreviewTone;
};

export type PreviewInfo = {
  title: string;
  description: string;
  footer: string;
  initials: string;
};

const toneStyles: Record<
  PreviewTone,
  {
    frame: string;
    card: string;
    badge: string;
  }
> = {
  safe: {
    frame: "bg-[#9bcbea4d]",
    card: "bg-[#9bcbea33]",
    badge: "bg-[#1e492f] text-white",
  },
  suspicious: {
    frame: "bg-[#f5c16c33]",
    card: "bg-[#f5c16c26]",
    badge: "bg-[#6b4c16] text-white",
  },
  danger: {
    frame: "bg-[#fb50474d]",
    card: "bg-[#fb504733]",
    badge: "bg-[#6b1d1a] text-white",
  },
  neutral: {
    frame: "bg-[#9bcbea4d]",
    card: "bg-[#9bcbea33]",
    badge: "bg-[#214e69] text-white",
  },
};

const domainOverrides: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  "kevychsolutions.com": {
    title: "Kevych Solutions - Digital Solutions for Your Business",
    description:
      "Transform your business with Kevych Solutions. We specialise in mobile and web development.",
  },
};

export function PreviewCard({ result, tone }: PreviewCardProps) {
  const preview = buildPreviewInfo(result);
  const styles = toneStyles[tone];

  return (
    <div className={`rounded-[18px] p-[2px] ${styles.frame}`}>
      <div
        className={`flex items-center gap-2 overflow-hidden rounded-[16px] pr-2 ${styles.card}`}
      >
        <div className="self-stretch">
          <div
            className={`flex h-full w-14 items-center justify-center rounded-l-[10px] px-2 ${styles.badge}`}
          >
            <span className="text-xl font-medium">{preview.initials}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 py-3">
          <p className="line-clamp-2 text-sm font-medium leading-4 text-white">
            {preview.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/60">
            {preview.description}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] font-medium ${styles.badge}`}
            >
              {preview.initials}
            </div>
            <p className="truncate text-xs font-medium text-white/60">
              {preview.footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildPreviewInfo(result: QRInspectionResult): PreviewInfo {
  const domain = getDetail(result, "Domain");
  const merchant =
    getDetail(result, "Merchant name") ??
    getDetail(result, "PayPal target") ??
    getDetail(result, "Payment address");
  const ssid = getDetail(result, "SSID");
  const name = getDetail(result, "Name");
  const issuer = getDetail(result, "Issuer / authority") ?? getDetail(result, "Issuer");

  if (domain) {
    const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
    const override = domainOverrides[cleanDomain];

    if (override) {
      return {
        title: override.title,
        description: override.description,
        footer: cleanDomain,
        initials: getInitials("Kevych Solutions"),
      };
    }

    return {
      title: prettifyDomain(cleanDomain),
      description: getLinkDescription(result),
      footer: cleanDomain,
      initials: getInitials(prettifyDomain(cleanDomain)),
    };
  }

  if (merchant) {
    return {
      title: merchant,
      description:
        result.detectedType === "Crypto payment or wallet"
          ? "Crypto payment or wallet information."
          : "Payment details detected in this QR code.",
      footer: getDetail(result, "Amount") ?? result.scheme ?? "Payment request",
      initials: getInitials(merchant),
    };
  }

  if (ssid) {
    return {
      title: ssid,
      description: "Wi-Fi network details detected.",
      footer: getDetail(result, "Encryption") ?? "Wi-Fi configuration",
      initials: getInitials(ssid),
    };
  }

  if (name) {
    return {
      title: name,
      description: "Contact details detected in this QR code.",
      footer: getDetail(result, "Email") ?? getDetail(result, "Phone") ?? "Contact card",
      initials: getInitials(name),
    };
  }

  if (issuer) {
    return {
      title: issuer,
      description: "Document or verification data detected.",
      footer: getDetail(result, "Type") ?? result.detectedType,
      initials: getInitials(issuer),
    };
  }

  const fallbackTitle = result.verdict?.label ?? result.detectedType;
  return {
    title: fallbackTitle,
    description: result.plainLanguage ?? result.summary,
    footer: result.scheme ?? result.detectedType,
    initials: getInitials(fallbackTitle),
  };
}

export function getToneFromVerdict(
  verdictLevel: VerdictLevel | undefined,
): PreviewTone {
  if (verdictLevel === "safe") {
    return "safe";
  }

  if (verdictLevel === "suspicious" || verdictLevel === "needs-verification") {
    return "suspicious";
  }

  if (verdictLevel === "scam") {
    return "danger";
  }

  return "neutral";
}

function getLinkDescription(result: QRInspectionResult): string {
  if (result.verdict?.level === "safe") {
    return "This link looks low risk from the QR data.";
  }

  if (result.verdict?.level === "scam") {
    return "This link shows strong scam or phishing signs.";
  }

  if (result.verdict?.level === "suspicious") {
    return "This link needs caution before opening.";
  }

  return "This QR contains a website or document link.";
}

function getDetail(result: QRInspectionResult, label: string): string | undefined {
  return result.details.find((detail) => detail.label === label)?.value;
}

function getInitials(value: string): string {
  const words = value
    .replace(/https?:\/\//gi, "")
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "QR";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function prettifyDomain(domain: string): string {
  const base = domain.replace(/\.[a-z0-9-]+$/i, "");
  const words = base.split(/[-.]+/).filter(Boolean);

  if (!words.length) {
    return domain;
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
