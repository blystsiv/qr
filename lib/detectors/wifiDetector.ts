import type { DetectorContext, QRInspectionResult } from "@/lib/types/qr";
import { maskSensitiveValue } from "@/lib/utils/riskAnalysis";

type WifiPayload = {
  encryptionType: string;
  ssid: string;
  password: string;
  hidden: boolean;
};

export function detectWifi(context: DetectorContext): QRInspectionResult | null {
  if (!/^WIFI:/i.test(context.normalizedPayload)) {
    return null;
  }

  context.pushStep("Matched WIFI: prefix.");
  const parsed = parseWifiPayload(context.normalizedPayload);
  const isOpenNetwork =
    !parsed.encryptionType || parsed.encryptionType.toUpperCase() === "NOPASS";

  return {
    detectedType: "Wi-Fi configuration",
    scheme: "WIFI",
    confidence: "high",
    riskLevel: isOpenNetwork ? "high" : "medium",
    summary: `This QR can configure the Wi-Fi network "${
      parsed.ssid || "Unknown network"
    }".`,
    details: [
      { label: "SSID", value: parsed.ssid || "Not provided" },
      {
        label: "Encryption",
        value: isOpenNetwork ? "Open network" : parsed.encryptionType,
      },
      { label: "Hidden network", value: parsed.hidden ? "Yes" : "No" },
      {
        label: "Password",
        value: parsed.password
          ? `Hidden in parsed view: ${maskSensitiveValue(parsed.password)}`
          : "Not provided",
      },
    ],
    safetyNotes: [
      "This QR contains Wi-Fi configuration data, not a website link.",
      "Joining unknown networks may be risky.",
      isOpenNetwork
        ? "This network appears to be open, so traffic may not be encrypted."
        : "Only join this network if you trust the source of the QR code.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "wifiDetector",
      steps: [],
    },
  };
}

function parseWifiPayload(payload: string): WifiPayload {
  const body = payload.slice(5);
  const fields = new Map<string, string>();

  for (const segment of splitEscapedSegments(body)) {
    if (!segment) {
      continue;
    }

    const separatorIndex = segment.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = segment.slice(0, separatorIndex);
    const value = segment.slice(separatorIndex + 1);
    fields.set(key, unescapeWifiValue(value));
  }

  return {
    encryptionType: fields.get("T") || "nopass",
    ssid: fields.get("S") || "",
    password: fields.get("P") || "",
    hidden: /^(true|1)$/i.test(fields.get("H") || "false"),
  };
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

function unescapeWifiValue(value: string): string {
  return value.replace(/\\([\\;,:"])/g, "$1");
}
