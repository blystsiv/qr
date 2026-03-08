import type { SamplePayload } from "@/lib/types/qr";

export const samplePayloads: SamplePayload[] = [
  {
    id: "safe-website",
    label: "Popular safe link",
    description: "Well-known domain with no obvious format-level red flags.",
    payload: "https://www.wikipedia.org/wiki/QR_code",
  },
  {
    id: "suspicious-website",
    label: "Suspicious link",
    description: "Unknown shared-hosting link with login-style wording.",
    payload: "https://gift-claim-check.pages.dev/account/update",
  },
  {
    id: "scam-link",
    label: "Likely scam link",
    description: "Synthetic phishing-style link for testing.",
    payload: "http://paypal-login-security-check.example/verify",
  },
  {
    id: "document-link",
    label: "Document link",
    description: "Cloud document sharing link.",
    payload:
      "https://docs.google.com/document/d/1234567890abcdef/edit?usp=sharing",
  },
  {
    id: "location-link",
    label: "Map link",
    description: "Map or navigation style QR.",
    payload: "geo:50.4501,30.5234?q=Kyiv%20City%20Center",
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
  {
    id: "document-json",
    label: "Document data",
    description: "Structured document or verification JSON.",
    payload:
      '{"issuer":"City Service Portal","documentType":"visitor_pass","documentNumber":"AB1234567","expiryDate":"2026-12-31","verification":true}',
  },
];
