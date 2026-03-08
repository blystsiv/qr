export const publicSettings = {
  enableUrlReputation:
    process.env.NEXT_PUBLIC_ENABLE_URL_REPUTATION === "true",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
};

export const serverIntegrationEnvNames = [
  "VIRUSTOTAL_API_KEY",
  "SAFE_BROWSING_API_KEY",
  "PAYMENT_INTELLIGENCE_API_KEY",
];
