import type { QRInspectionResult } from "@/lib/types/qr";

export type ReportReason =
  | "spam"
  | "scam"
  | "phishing"
  | "malicious"
  | "suspicious"
  | "impersonation"
  | "wrong-receiver"
  | "unexpected-payment"
  | "unsafe-network"
  | "fake-document";

export type ReportDraft = {
  suggestedName: string;
  comment: string;
  reason: ReportReason;
};

export type ReportReasonOption = {
  value: ReportReason;
  label: string;
  description: string;
};

export type ReportContext = {
  screenTitle: string;
  intro: string;
  reasonLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  commentLabel: string;
  commentPlaceholder: string;
  privacyNote: string;
  submitLabel: string;
  reasonOptions: ReportReasonOption[];
};

const privacyNote =
  "Do not include passwords, card numbers, private keys, or personal IDs.";

export function getReportContext(result: QRInspectionResult): ReportContext {
  const subject = getReportSubject(result);

  if (isLinkResult(result)) {
    return {
      screenTitle: "Report link",
      intro: "Use this if the link looked fake, misleading, or unsafe.",
      reasonLabel: "Why are you reporting this link?",
      nameLabel: "Report title",
      namePlaceholder: subject ? `${subject} link` : "Suspicious link",
      commentLabel: "What happened?",
      commentPlaceholder:
        "Example: It copied a trusted brand, asked for my login, or redirected me somewhere unexpected.",
      privacyNote,
      submitLabel: "Save report",
      reasonOptions: [
        {
          value: "phishing",
          label: "Phishing",
          description: "Pretends to be trusted to steal login or personal data.",
        },
        {
          value: "impersonation",
          label: "Impersonation",
          description: "Looks like a real brand, person, or service but is not.",
        },
        {
          value: "malicious",
          label: "Malicious",
          description: "Could harm the device, account, or user.",
        },
        {
          value: "scam",
          label: "Scam",
          description: "Tried to trick the user into paying or trusting it.",
        },
        {
          value: "suspicious",
          label: "Suspicious",
          description: "Something feels wrong, but the exact risk is unclear.",
        },
      ],
    };
  }

  if (result.detectedType === "Payment QR") {
    return {
      screenTitle: "Report payment QR",
      intro:
        "Use this if the payment request felt misleading, unexpected, or sent money to the wrong receiver.",
      reasonLabel: "Why are you reporting this payment QR?",
      nameLabel: "Report title",
      namePlaceholder: subject ? `${subject} payment request` : "Unexpected payment request",
      commentLabel: "What looked wrong?",
      commentPlaceholder:
        "Example: The merchant looked wrong, the amount was unexpected, or I do not know who would receive the money.",
      privacyNote,
      submitLabel: "Save report",
      reasonOptions: [
        {
          value: "wrong-receiver",
          label: "Wrong receiver",
          description: "The payment appears to go to the wrong person or account.",
        },
        {
          value: "unexpected-payment",
          label: "Unexpected payment",
          description: "It asked for money when the user did not expect to pay.",
        },
        {
          value: "scam",
          label: "Scam",
          description: "Looks like a fake or deceptive request for money.",
        },
        {
          value: "impersonation",
          label: "Impersonation",
          description: "Pretends to be a trusted merchant or service.",
        },
        {
          value: "suspicious",
          label: "Suspicious",
          description: "Something feels wrong, but the exact risk is unclear.",
        },
      ],
    };
  }

  if (result.detectedType === "Crypto payment or wallet") {
    return {
      screenTitle: "Report crypto QR",
      intro:
        "Use this if the wallet or crypto payment request looks fake, misleading, or unsafe.",
      reasonLabel: "Why are you reporting this crypto QR?",
      nameLabel: "Report title",
      namePlaceholder: subject ? `${subject} wallet` : "Suspicious crypto wallet",
      commentLabel: "What looked wrong?",
      commentPlaceholder:
        "Example: The wallet was unfamiliar, the amount was unexpected, or someone pushed me to send funds quickly.",
      privacyNote,
      submitLabel: "Save report",
      reasonOptions: [
        {
          value: "wrong-receiver",
          label: "Wrong receiver",
          description: "The wallet or payment target looks wrong.",
        },
        {
          value: "impersonation",
          label: "Impersonation",
          description: "Pretends to be a trusted person, wallet, or project.",
        },
        {
          value: "scam",
          label: "Scam",
          description: "Looks like a deceptive attempt to take crypto funds.",
        },
        {
          value: "malicious",
          label: "Malicious",
          description: "Could harm the wallet, device, or user.",
        },
        {
          value: "suspicious",
          label: "Suspicious",
          description: "Something feels wrong, but the exact risk is unclear.",
        },
      ],
    };
  }

  if (result.detectedType === "Wi-Fi configuration") {
    return {
      screenTitle: "Report network QR",
      intro:
        "Use this if the Wi-Fi network looks unsafe, unfamiliar, or not what you expected.",
      reasonLabel: "Why are you reporting this network QR?",
      nameLabel: "Report title",
      namePlaceholder: subject ? `${subject} network` : "Unsafe Wi-Fi network",
      commentLabel: "What looked wrong?",
      commentPlaceholder:
        "Example: I do not recognize this network, the name looks fake, or I was asked to join it unexpectedly.",
      privacyNote,
      submitLabel: "Save report",
      reasonOptions: [
        {
          value: "unsafe-network",
          label: "Unsafe network",
          description: "The Wi-Fi network looks risky or untrustworthy.",
        },
        {
          value: "malicious",
          label: "Malicious",
          description: "Could be used to harm the device or steal data.",
        },
        {
          value: "suspicious",
          label: "Suspicious",
          description: "Something feels wrong, but the exact risk is unclear.",
        },
        {
          value: "scam",
          label: "Scam",
          description: "Looks like a deceptive attempt to make the user connect.",
        },
      ],
    };
  }

  if (looksDocumentLike(result)) {
    return {
      screenTitle: "Report document QR",
      intro:
        "Use this if the document, ID, contact, or official data looks fake, misleading, or unofficial.",
      reasonLabel: "Why are you reporting this QR?",
      nameLabel: "Report title",
      namePlaceholder: subject ? `${subject} document` : "Possible fake document",
      commentLabel: "What looked wrong?",
      commentPlaceholder:
        "Example: The issuer looked fake, the details did not match, or the document felt unofficial.",
      privacyNote,
      submitLabel: "Save report",
      reasonOptions: [
        {
          value: "fake-document",
          label: "Fake document",
          description: "Looks unofficial, altered, or not from the claimed issuer.",
        },
        {
          value: "impersonation",
          label: "Impersonation",
          description: "Pretends to be a trusted authority, company, or person.",
        },
        {
          value: "scam",
          label: "Scam",
          description: "Looks like a deceptive attempt to gain trust or money.",
        },
        {
          value: "suspicious",
          label: "Suspicious",
          description: "Something feels wrong, but the exact risk is unclear.",
        },
      ],
    };
  }

  return {
    screenTitle: "Report result",
    intro: "Use this if the QR result looks wrong, misleading, or unsafe.",
    reasonLabel: "Why are you reporting this QR?",
    nameLabel: "Report title",
    namePlaceholder: subject || "Suspicious QR result",
    commentLabel: "What happened?",
    commentPlaceholder:
      "Example: The result looked misleading, unsafe, or did not match what the user expected.",
    privacyNote,
    submitLabel: "Save report",
    reasonOptions: [
      {
        value: "scam",
        label: "Scam",
        description: "Looks like an attempt to trick the user.",
      },
      {
        value: "suspicious",
        label: "Suspicious",
        description: "Something feels wrong, but the exact risk is unclear.",
      },
      {
        value: "malicious",
        label: "Malicious",
        description: "Could harm the device, account, or user.",
      },
      {
        value: "spam",
        label: "Spam",
        description: "Unwanted promotion or repeated messages.",
      },
    ],
  };
}

export function getDefaultReportReason(result: QRInspectionResult): ReportReason {
  if (result.verdict?.level === "scam") {
    return "scam";
  }

  if (result.detectedType === "Payment QR") {
    return "wrong-receiver";
  }

  if (result.detectedType === "Crypto payment or wallet") {
    return "wrong-receiver";
  }

  if (result.detectedType === "Wi-Fi configuration") {
    return "unsafe-network";
  }

  if (looksDocumentLike(result)) {
    return "fake-document";
  }

  if (isLinkResult(result)) {
    return result.verdict?.level === "suspicious" ? "phishing" : "suspicious";
  }

  return "suspicious";
}

export function formatReportReason(reason: ReportReason): string {
  switch (reason) {
    case "phishing":
      return "Phishing";
    case "wrong-receiver":
      return "Wrong receiver";
    case "unexpected-payment":
      return "Unexpected payment";
    case "unsafe-network":
      return "Unsafe network";
    case "fake-document":
      return "Fake document";
    case "impersonation":
      return "Impersonation";
    default:
      return reason.charAt(0).toUpperCase() + reason.slice(1);
  }
}

export function isLinkResult(result: QRInspectionResult): boolean {
  return [
    "Website link",
    "Document or file link",
    "App store link",
    "Location link",
  ].includes(result.detectedType);
}

function looksDocumentLike(result: QRInspectionResult): boolean {
  return [
    "Document / verification data (possible)",
    "Government / identity / official data (possible)",
    "Signed token / verification data",
    "Contact card",
    "Calendar event",
  ].includes(result.detectedType);
}

function getReportSubject(result: QRInspectionResult): string {
  const detailSubject =
    getDetail(result, "Domain") ??
    getDetail(result, "Merchant name") ??
    getDetail(result, "Wallet / payment target") ??
    getDetail(result, "SSID") ??
    getDetail(result, "Issuer / authority") ??
    getDetail(result, "Issuer") ??
    getDetail(result, "Name");

  if (!detailSubject) {
    return result.detectedType;
  }

  return detailSubject.replace(/^www\./, "");
}

function getDetail(result: QRInspectionResult, label: string): string | undefined {
  return result.details.find((detail) => detail.label === label)?.value;
}
