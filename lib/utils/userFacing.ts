import type {
  QRInspectionResult,
  QRUserVerdict,
  VerdictLevel,
} from "@/lib/types/qr";

export function withUserFacingDefaults(
  result: QRInspectionResult,
): QRInspectionResult {
  return {
    ...result,
    plainLanguage: result.plainLanguage ?? derivePlainLanguage(result),
    recommendedActions:
      result.recommendedActions ?? deriveRecommendedActions(result),
    verdict: result.verdict ?? deriveVerdict(result),
  };
}

function deriveVerdict(result: QRInspectionResult): QRUserVerdict {
  const linkLikeTypes = new Set([
    "Website link",
    "Document or file link",
    "Location link",
    "App store link",
  ]);

  if (linkLikeTypes.has(result.detectedType)) {
    if (result.riskLevel === "high") {
      return {
        level: "scam",
        label: "Likely scam",
        explanation:
          "This link shows strong warning signs that are commonly used in phishing or scam links.",
      };
    }

    if (result.riskLevel === "medium") {
      return {
        level: "suspicious",
        label: "Suspicious",
        explanation:
          "This link has some warning signs. It may still be legitimate, but it should be checked carefully before opening or trusting it.",
      };
    }

    return {
      level: "safe",
      label: "Likely safe",
      explanation:
        "This link looks technically normal and does not show obvious format-level red flags. That is not a guarantee that the content is trustworthy.",
    };
  }

  if (result.detectedType === "Payment QR") {
    if (result.riskLevel === "high") {
      return {
        level: "suspicious",
        label: "Payment needs extra caution",
        explanation:
          "The payment QR has technical or structural warning signs. Do not pay unless you can verify the request another way.",
      };
    }

    return {
      level: "needs-verification",
      label: "Payment needs verification",
      explanation:
        "The payment data may be technically valid, but that does not prove the person asking for money is trustworthy.",
    };
  }

  if (
    [
      "Crypto payment or wallet",
      "Wi-Fi configuration",
      "Government / identity / official data (possible)",
      "Document / verification data (possible)",
      "Signed token / verification data",
    ].includes(result.detectedType)
  ) {
    return {
      level: "needs-verification",
      label: "Needs verification",
      explanation:
        "This QR may be well-formed, but you should still verify the source and purpose before acting on it.",
    };
  }

  if (result.detectedType === "No QR content yet") {
    return {
      level: "informational",
      label: "Waiting for input",
      explanation:
        "Add a QR payload first and the app will explain what it likely contains.",
    };
  }

  return {
    level: "informational",
    label: "Informational",
    explanation:
      "This result is mainly descriptive. Review the contents before taking any action.",
  };
}

function derivePlainLanguage(result: QRInspectionResult): string {
  switch (result.detectedType) {
    case "Payment QR":
      return "This is a payment request. The code itself may look valid, but that does not prove the person asking for money is honest.";
    case "Website link":
      return "This QR opens a website link. A normal-looking link can still lead to a fake page, so check the domain and what the page asks you to do.";
    case "Document or file link":
      return "This QR opens a document or file link instead of a normal page. Be careful with downloads and shared documents from unknown senders.";
    case "Location link":
      return "This QR opens a location or map destination.";
    case "Wi-Fi configuration":
      return "This QR would let your device join a Wi-Fi network.";
    case "Crypto payment or wallet":
      return "This QR points to a crypto wallet or payment request. Crypto transfers are usually irreversible.";
    case "Structured text or app-specific data":
      return "This QR looks like structured app data rather than a normal link.";
    default:
      return result.summary;
  }
}

function deriveRecommendedActions(result: QRInspectionResult): string[] {
  switch (result.detectedType) {
    case "Website link":
    case "Document or file link":
    case "Location link":
    case "App store link":
      if (result.riskLevel === "high") {
        return [
          "Do not open the link unless you can verify it independently.",
          "Do not enter passwords, payment details, or verification codes.",
          "Ask the sender for a different verified link if needed.",
        ];
      }

      if (result.riskLevel === "medium") {
        return [
          "Open it only if you trust the sender and expected this link.",
          "Type the official site manually if you can instead of following the link.",
          "Do not log in, pay, or download anything until the destination is confirmed.",
        ];
      }

      return [
        "You can open the link if you expected it.",
        "Still check the page before logging in, paying, or downloading anything.",
      ];
    case "Payment QR":
      return [
        "Check the merchant or payee name.",
        "Confirm the amount before approving payment.",
        "Only continue if you expected this payment request.",
      ];
    case "Crypto payment or wallet":
      return [
        "Check the wallet address carefully.",
        "Confirm the amount and network before sending.",
        "Do not continue if the request came from an untrusted source.",
      ];
    case "Wi-Fi configuration":
      return [
        "Join the network only if you trust its owner.",
        "Be cautious with open networks.",
      ];
    case "Phone or messaging action":
    case "Email action":
      return [
        "Check the recipient before sending anything.",
        "Do not continue if the request looks unexpected.",
      ];
    default:
      return ["Review the contents before taking action."];
  }
}

export function makeVerdict(
  level: VerdictLevel,
  label: string,
  explanation: string,
): QRUserVerdict {
  return { level, label, explanation };
}
