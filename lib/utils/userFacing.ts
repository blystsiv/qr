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

    if (result.detectedType === "Location link") {
      return {
        level: "safe",
        label: "Looks safe to open",
        explanation:
          "This looks like a normal map or location link. You should still confirm the destination before starting navigation.",
      };
    }

    if (result.detectedType === "App store link") {
      return {
        level: "safe",
        label: "Looks safe to open",
        explanation:
          "This looks like a normal app store link. You should still confirm the app name and publisher before installing anything.",
      };
    }

    if (result.detectedType === "Document or file link") {
      return {
        level: "safe",
        label: "Looks safe to open",
        explanation:
          "This looks like a normal document or file link, but you should still verify the sender before downloading or opening it.",
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

  if (result.detectedType === "Phone or messaging action") {
    return {
      level: "informational",
      label: "Message or phone action",
      explanation:
        "This QR opens a call, text, or chat action. Check the recipient before you continue.",
    };
  }

  if (result.detectedType === "Email action") {
    return {
      level: "informational",
      label: "Email draft",
      explanation:
        "This QR prepares an email draft. Review the address and message before sending anything.",
    };
  }

  if (["Contact card", "Calendar event"].includes(result.detectedType)) {
    return {
      level: "informational",
      label: "Saved data",
      explanation:
        "This QR contains contact or event information. Check the details before importing it into another app.",
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

  if (result.detectedType === "Text note") {
    return {
      level: "informational",
      label: "Text only",
      explanation:
        "This QR contains plain text. It does not open a website or trigger an action by itself.",
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
  const linkKind = getDetail(result, "Link kind");
  const provider = getDetail(result, "Provider");

  switch (result.detectedType) {
    case "Payment QR":
      return "This is a payment request. The code itself may look valid, but that does not prove the person asking for money is honest.";
    case "Website link":
      if (linkKind && provider) {
        return `This QR opens a ${linkKind.toLowerCase()} on ${provider}.`;
      }

      if (linkKind) {
        return `This QR opens a ${linkKind.toLowerCase()}.`;
      }

      return "This QR opens a website link. A normal-looking link can still lead to a fake page, so check the domain and what the page asks you to do.";
    case "Document or file link":
      if (linkKind && provider) {
        return `This QR opens a ${linkKind.toLowerCase()} on ${provider}.`;
      }

      return "This QR opens a document or file link instead of a normal page. Be careful with downloads and shared documents from unknown senders.";
    case "Location link":
      return "This QR opens a location or map destination.";
    case "App store link":
      return "This QR opens an app store page. Check the app name and publisher before installing anything.";
    case "Wi-Fi configuration":
      return "This QR would let your device join a Wi-Fi network.";
    case "Crypto payment or wallet":
      return "This QR points to a crypto wallet or payment request. Crypto transfers are usually irreversible.";
    case "Phone or messaging action":
      return "This QR opens a phone, SMS, or chat action.";
    case "Email action":
      return "This QR opens an email draft.";
    case "Contact card":
      return "This QR contains contact details that another app can save.";
    case "Calendar event":
      return "This QR contains an event that another app can add to a calendar.";
    case "Structured text or app-specific data":
      return "This QR looks like structured app data rather than a normal link.";
    case "Text note":
      return "This QR contains plain text.";
    default:
      return result.summary;
  }
}

function deriveRecommendedActions(result: QRInspectionResult): string[] {
  switch (result.detectedType) {
    case "Location link":
      return [
        "You can open the location if you expected it.",
        "Check the destination before starting navigation.",
      ];
    case "App store link":
      return [
        "You can open the listing if you expected it.",
        "Check the app name and publisher before installing anything.",
      ];
    case "Document or file link":
      if (result.riskLevel === "high") {
        return [
          "Do not open the file or document until the sender is verified.",
          "Do not download anything if the request feels unexpected.",
        ];
      }

      return [
        "Open it only if you expected this file or shared document.",
        "Check what the file or page asks you to do before continuing.",
      ];
    case "Website link":
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
      return [
        "Check the recipient before sending anything.",
        "Do not continue if the request looks unexpected.",
      ];
    case "Email action":
      return [
        "Check the address before sending anything.",
        "Review the subject and message first.",
      ];
    case "Contact card":
      return [
        "Check the name, phone, and email before saving the contact.",
      ];
    case "Calendar event":
      return [
        "Check the title, date, and location before adding the event.",
      ];
    case "Text note":
      return [
        "Read the text before copying or using it somewhere else.",
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

function getDetail(result: QRInspectionResult, label: string): string | undefined {
  return result.details.find((detail) => detail.label === label)?.value;
}
