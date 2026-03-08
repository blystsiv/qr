import { publicSettings } from "@/lib/config";

export type UrlReputationPlaceholderStatus = {
  state: "disabled" | "not-configured" | "ready";
  message: string;
};

export async function lookupUrlReputationPlaceholder(
  url: string,
): Promise<UrlReputationPlaceholderStatus> {
  if (!publicSettings.enableUrlReputation) {
    return {
      state: "disabled",
      message:
        "URL reputation lookups are disabled. Set NEXT_PUBLIC_ENABLE_URL_REPUTATION=true to enable the placeholder flow.",
    };
  }

  if (!publicSettings.apiBaseUrl) {
    return {
      state: "not-configured",
      message:
        "Set NEXT_PUBLIC_API_BASE_URL to a server-side proxy route for VirusTotal or Safe Browsing checks.",
    };
  }

  return {
    state: "ready",
    message: `Add a fetch() call here for ${url} using ${publicSettings.apiBaseUrl}.`,
  };
}
