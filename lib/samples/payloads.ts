import type { SamplePayload } from "@/lib/types/qr";

export const samplePayloads: SamplePayload[] = [
  {
    id: "safe-website",
    label: "Safe website URL",
    description: "HTTPS link with no obvious format-level red flags.",
    payload: "https://www.wikipedia.org/wiki/QR_code",
  },
  {
    id: "suspicious-website",
    label: "Suspicious website URL",
    description: "HTTP plus punycode-style hostname for risk-note testing.",
    payload: "http://xn--paypa1-secure-jzb.com/account/review",
  },
  {
    id: "wifi",
    label: "Wi-Fi QR",
    description: "Standard WIFI: payload with password hidden in parsed view.",
    payload: "WIFI:T:WPA;S:Cafe Guest WiFi;P:coffee12345;H:false;;",
  },
  {
    id: "vcard",
    label: "vCard",
    description: "Contact card with basic identity details.",
    payload:
      "BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nORG:OpenAI Test Lab\nTEL:+12025550124\nEMAIL:jane@example.com\nEND:VCARD",
  },
  {
    id: "bitcoin",
    label: "Bitcoin URI",
    description: "Crypto wallet/payment request example.",
    payload:
      "bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?amount=0.015&label=Prototype%20Wallet",
  },
  {
    id: "upi",
    label: "UPI example",
    description: "Direct UPI payment request.",
    payload:
      "upi://pay?pa=merchant@upi&pn=Corner%20Cafe&am=250.00&cu=INR&tn=Lunch",
  },
  {
    id: "qris",
    label: "EMV / QRIS example",
    description: "Structured TLV payload with nested tags and CRC.",
    payload:
      "00020101021226680019COM.PERMATABANK.WWW011893600013160062841902120088065561060303UKE51440014ID.CO.QRIS.WWW0215ID20254099347700303UKE52045812530336054064315205802ID5925LA BARACCA CANGGU RESTAUR6006BADUNG610580361623401180001740603261929580708006775396304600F",
  },
  {
    id: "unknown",
    label: "Unknown text QR",
    description: "App-specific plain text that should fall back cleanly.",
    payload: "INTERNAL-CHECKIN|SITE=KIOSK-07|TOKEN=ABC123XYZ",
  },
];
