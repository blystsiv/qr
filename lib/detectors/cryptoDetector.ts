import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";

const bitcoinAddressPattern = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const ethereumAddressPattern = /^0x[a-fA-F0-9]{40}$/;
const litecoinAddressPattern = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,50}$/;
const solanaAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function detectCrypto(
  context: DetectorContext,
): QRInspectionResult | null {
  const payload = context.normalizedPayload;
  const directMatch = parseCryptoUri(payload);

  if (directMatch) {
    context.pushStep(`Matched ${directMatch.protocol}: prefix.`);
    return buildCryptoResult(context, {
      protocol: directMatch.protocol,
      address: directMatch.address,
      amount: directMatch.amount,
      label: directMatch.label,
      confidence: "high",
      heuristic: false,
    });
  }

  const heuristicMatch = detectWalletLikeString(payload);
  if (!heuristicMatch) {
    return null;
  }

  context.pushStep(
    `Matched wallet-like heuristic for ${heuristicMatch.protocol}.`,
  );

  return buildCryptoResult(context, {
    protocol: heuristicMatch.protocol,
    address: heuristicMatch.address,
    confidence: heuristicMatch.confidence,
    heuristic: true,
  });
}

function parseCryptoUri(payload: string): {
  protocol: string;
  address: string;
  amount?: string;
  label?: string;
} | null {
  const match = payload.match(/^(bitcoin|ethereum|litecoin|solana):/i);
  if (!match) {
    return null;
  }

  const protocol = capitalize(match[1].toLowerCase());
  const remainder = payload.slice(match[0].length).replace(/^\/\//, "");
  const [address, query = ""] = remainder.split("?", 2);
  const params = new URLSearchParams(query);

  return {
    protocol,
    address,
    amount: params.get("amount") ?? params.get("value") ?? undefined,
    label: params.get("label") ?? params.get("message") ?? undefined,
  };
}

function detectWalletLikeString(payload: string): {
  protocol: string;
  address: string;
  confidence: "medium" | "low";
} | null {
  if (ethereumAddressPattern.test(payload)) {
    return {
      protocol: "Ethereum",
      address: payload,
      confidence: "medium",
    };
  }

  if (bitcoinAddressPattern.test(payload)) {
    return {
      protocol: "Bitcoin",
      address: payload,
      confidence: "medium",
    };
  }

  if (litecoinAddressPattern.test(payload)) {
    return {
      protocol: "Litecoin",
      address: payload,
      confidence: "medium",
    };
  }

  if (solanaAddressPattern.test(payload)) {
    return {
      protocol: "Solana",
      address: payload,
      confidence: "low",
    };
  }

  return null;
}

function buildCryptoResult(
  context: DetectorContext,
  options: {
    protocol: string;
    address: string;
    amount?: string;
    label?: string;
    confidence: "high" | "medium" | "low";
    heuristic: boolean;
  },
): QRInspectionResult {
  const details: QRInspectionDetail[] = [
    { label: "Protocol", value: options.protocol },
    { label: "Wallet / payment target", value: options.address || "Not provided" },
  ];

  if (options.amount) {
    details.push({ label: "Amount", value: options.amount });
  }

  if (options.label) {
    details.push({ label: "Label", value: options.label });
  }

  return {
    detectedType: "Crypto payment or wallet",
    scheme: options.protocol,
    confidence: options.confidence,
    riskLevel: "medium",
    summary: `This QR ${
      options.heuristic ? "appears to contain" : "contains"
    } a ${options.protocol} wallet or payment request.`,
    details,
    safetyNotes: [
      "This QR contains crypto wallet or payment information, not a website link.",
      "Crypto transfers are typically irreversible. Verify the wallet carefully.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "cryptoDetector",
      steps: [],
      heuristics: options.heuristic
        ? [`Wallet-like ${options.protocol} address matched.`]
        : undefined,
    },
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
