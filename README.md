# QR Inspector Prototype

Small Next.js prototype for scanning, uploading, or pasting QR payloads and immediately classifying what they contain.

The app is intentionally simple. It is built for testing many QR formats quickly, not for production-ready scanning workflows or threat intelligence.

Verdict labels in the UI are heuristic:

- `Likely safe` means no obvious format-level red flags were found.
- `Suspicious` means the link or payload has some warning signs.
- `Likely scam` means the app found strong phishing-style patterns.
- `Needs verification` means the format may be valid, but the sender or request still needs to be confirmed.

## Features

- Camera scan in the browser with [`html5-qrcode`](https://www.npmjs.com/package/html5-qrcode)
- Image upload with local QR decoding in the browser
- Manual paste of raw decoded QR content
- Rule-based classification pipeline with a single normalized result shape
- User-facing verdicts and recommended actions
- Parsed details for URLs, payment QRs, Wi-Fi, contact cards, email, phone, calendar events, crypto, and unknown text
- EMV / QRIS TLV parsing with nested tag inspection
- CRC-16 / CCITT-FALSE validation for EMV tag `63`
- Sample payload buttons
- Developer debug panel with detector steps, TLV tags, nested tags, and CRC output
- Optional env placeholders for future reputation APIs

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- `html5-qrcode`

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file if you want to test optional flags later:

```bash
cp .env.example .env.local
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

Camera scanning should be tested on `localhost` or another secure origin because browsers block camera access on insecure pages.

## Environment variables

Public flags:

- `NEXT_PUBLIC_ENABLE_URL_REPUTATION=false`
- `NEXT_PUBLIC_API_BASE_URL=`

Server-side placeholders:

- `VIRUSTOTAL_API_KEY=`
- `SAFE_BROWSING_API_KEY=`
- `PAYMENT_INTELLIGENCE_API_KEY=`

Important:

- Keep real API keys in `.env.local`, not in committed source files.
- The prototype does not ship with live VirusTotal or Safe Browsing requests enabled.
- If you later add a server route, read those secrets only on the server.

## Project structure

```text
app/
components/
lib/
  classifyQR.ts
  config.ts
  detectors/
  integrations/
  parsers/
  samples/
  types/
  utils/
```

## Detector pipeline

The main entry point is [`lib/classifyQR.ts`](./lib/classifyQR.ts).

It works in ordered layers:

1. Normalize the payload.
2. Try direct prefix / strong-format detectors first:
   - `WIFI:`
   - `BEGIN:VCARD`
   - `BEGIN:VEVENT`
   - `mailto:`, `tel:`, `sms:`
   - `geo:`
   - `bitcoin:`, `ethereum:`, `litecoin:`, `solana:`
   - `upi://`
3. Try structured payment detection:
   - EMV-style numeric TLV parsing
   - nested merchant account info tags
   - CRC validation
   - QRIS / EMV-compatible scheme identification
4. Try richer link detection:
   - `http://`, `https://`, and bare domains
   - document/file links
   - map links
   - app store links
5. Try document / verification payload heuristics:
   - JSON with document or verification markers
   - JWT-like signed tokens
6. Try low-confidence heuristics:
   - government / identity / official-looking markers
   - wallet-like strings
   - plain email / phone values
7. Fall back to structured text or `Text or unknown format`

Each detector returns the same normalized shape:

```ts
type QRInspectionResult = {
  detectedType: string;
  scheme?: string;
  confidence: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high" | "unknown";
  summary: string;
  details: { label: string; value: string }[];
  safetyNotes: string[];
  rawPayload: string;
  debug?: Record<string, unknown>;
};
```

## TLV parsing

The generic TLV parser lives in [`lib/parsers/tlvParser.ts`](./lib/parsers/tlvParser.ts).

It expects EMV-style fields in this format:

- 2 digits for the tag
- 2 digits for the length
- `length` characters for the value

Example:

```text
5908MERCHANT
```

That means:

- tag `59`
- length `08`
- value `MERCHANT`

The parser:

- walks the payload from left to right
- validates each tag header
- ensures the declared length fits inside the remaining payload
- returns parsed nodes with offsets for debug output
- fails gracefully on malformed data instead of crashing

## CRC validation

CRC validation is implemented in [`lib/parsers/emvParser.ts`](./lib/parsers/emvParser.ts).

For EMV payloads:

- tag `63` is treated as the CRC field
- the CRC value must be 4 hexadecimal characters
- the CRC is calculated using `CRC-16/CCITT-FALSE`
- the calculation covers the payload up to and including the CRC tag and length (`6304`)
- the 4-character CRC value itself is excluded from the calculation

The result panel shows:

- expected CRC
- calculated CRC
- whether they match

## Supported QR categories

Current rule-based support includes:

- Website links
- Document or file links
- Location links
- App store links
- Payment QR
  - UPI
  - PayPal patterns
  - EMV-compatible payment
  - QRIS markers
- Crypto wallet / crypto payment
- Wi-Fi configuration
- Email action
- Phone or messaging action
- Contact card
- Calendar event
- Government / identity / official data (heuristic)
- Document / verification data (heuristic)
- Signed token / verification data
- Structured text or app-specific data
- Text or unknown format

## Risk notes

The prototype adds simple human-readable risk notes, for example:

- URL uses `http` instead of `https`
- raw IP address
- punycode / `xn--`
- link shortener domain
- unusually long or hyphen-heavy hostname
- payment QR should be verified before proceeding
- unknown Wi-Fi networks can be risky
- crypto transfers are usually irreversible

These are format-level heuristics, not full security verdicts.

## Sample payloads

Sample buttons are defined in [`lib/samples/payloads.ts`](./lib/samples/payloads.ts).

Included examples:

- popular safe link
- suspicious link
- likely scam link
- document link
- map link
- Wi-Fi QR
- vCard
- bitcoin URI
- UPI example
- EMV / QRIS example
- document JSON
- unknown text QR

The suspicious and likely scam link samples are synthetic test links for QA, not live malicious destinations.

## How to add a new QR type

1. Add a new detector in `lib/detectors/`
2. Return the normalized `QRInspectionResult` shape
3. Register it in [`lib/detectors/index.ts`](./lib/detectors/index.ts) in the right order
4. If the format needs structured parsing, add a parser under `lib/parsers/`
5. Add one or more sample payloads in [`lib/samples/payloads.ts`](./lib/samples/payloads.ts)

Order matters. Put strong, explicit formats earlier than heuristics.

## Optional API integration points

The prototype works without any API calls.

Prepared extension points:

- [`lib/config.ts`](./lib/config.ts)
  - public flags for enabling future client-visible settings
- [`lib/integrations/urlReputation.ts`](./lib/integrations/urlReputation.ts)
  - placeholder for a future URL reputation flow

Recommended future architecture:

1. Add a server route such as `app/api/url-reputation/route.ts`
2. Read `VIRUSTOTAL_API_KEY` or `SAFE_BROWSING_API_KEY` only on the server
3. Call that server route from the client only for website URLs
4. Merge the returned reputation result into URL safety notes
5. Add a similar server-only route later for payment intelligence if needed

Do not expose those secret keys through `NEXT_PUBLIC_*` variables.

## Verification

Verified locally with:

```bash
npm run lint
npm run build
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
