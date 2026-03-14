import type { ReactNode } from "react";
import { PreviewCard, getToneFromVerdict } from "@/components/PreviewCard";
import { formatReportReason, type ReportDraft } from "@/lib/reporting";
import type {
  QRInspectionDetail,
  QRInspectionResult,
  RiskLevel,
  VerdictLevel,
} from "@/lib/types/qr";
import type { TLVNode } from "@/lib/types/tlv";

type ResultPanelProps = {
  result: QRInspectionResult;
  sourceLabel: string;
  developerMode: boolean;
  submittedReport: ReportDraft | null;
  onBack: () => void;
  onOpenDestination?: () => void;
  onOpenReport: () => void;
  onReset: () => void;
  onCopyPayload: () => void;
  openLabel: string;
};

const verdictCopy: Record<
  VerdictLevel,
  {
    title: string;
    subtitle: string;
    iconTone: string;
    iconBorder: string;
    icon: ReactNode;
  }
> = {
  safe: {
    title: "Safe",
    subtitle: "This result looks low risk from the QR data.",
    iconTone: "bg-[#86cf75] text-[#0e2838]",
    iconBorder: "border-[#abec9d]",
    icon: <ShieldIcon className="h-8 w-8" />,
  },
  suspicious: {
    title: "Needs caution",
    subtitle: "This result has warning signs and should be checked carefully.",
    iconTone: "bg-[#f5c16c] text-[#0e2838]",
    iconBorder: "border-[#f8d99a]",
    icon: <WarningIcon className="h-8 w-8" />,
  },
  scam: {
    title: "High risk",
    subtitle: "This result shows strong scam or phishing signs.",
    iconTone: "bg-[#fb5047] text-white",
    iconBorder: "border-[#ff847d]",
    icon: <WarningIcon className="h-8 w-8" />,
  },
  "needs-verification": {
    title: "Check first",
    subtitle: "The QR format may be valid, but you still need to verify it.",
    iconTone: "bg-[#9bcbea] text-[#0e2838]",
    iconBorder: "border-[#bce2f8]",
    icon: <InfoIcon className="h-8 w-8" />,
  },
  informational: {
    title: "Review",
    subtitle: "Read the result before you do anything with this QR code.",
    iconTone: "bg-[#9bcbea] text-[#0e2838]",
    iconBorder: "border-[#bce2f8]",
    icon: <InfoIcon className="h-8 w-8" />,
  },
};

const detailPriority: Record<string, string[]> = {
  "Website link": ["Domain", "Normalized URL", "Known domain", "Path", "Provider"],
  "Document or file link": ["Domain", "Normalized URL", "Provider", "Path"],
  "App store link": ["Domain", "Normalized URL", "Provider"],
  "Location link": ["Location", "Normalized URL"],
  "Payment QR": [
    "Merchant name",
    "Amount",
    "Currency",
    "Country",
    "City",
    "Payment address",
    "PayPal target",
    "Reference / note",
    "Reference",
  ],
  "Crypto payment or wallet": [
    "Wallet / payment target",
    "Amount",
    "Label",
    "Protocol",
  ],
  "Wi-Fi configuration": ["SSID", "Encryption", "Hidden network", "Password"],
  "Email action": ["Email target", "Subject", "Body"],
  "Phone or messaging action": ["Phone number", "Recipient", "Message body"],
  "Contact card": ["Name", "Phone", "Email", "Organization"],
  "Calendar event": ["Summary", "Starts", "Ends", "Location"],
  "Document / verification data (possible)": [
    "Issuer / authority",
    "Type",
    "Identifier",
    "Expires",
  ],
  "Government / identity / official data (possible)": [
    "Issuer / authority",
    "Type",
    "Identifier",
    "Expires",
  ],
  "Signed token / verification data": [
    "Issuer",
    "Credential type",
    "Subject",
    "Expires",
  ],
};

const hiddenDetailLabels = new Set([
  "Normalization",
  "Query params",
  "Matched markers",
  "Top-level keys",
  "Link kind",
  "CRC valid",
  "CRC status",
  "Provider markers",
  "Payload format",
]);

const detailLabels: Record<string, string> = {
  "Normalized URL": "Destination",
  "Known domain": "Recognized site",
  "Wallet / payment target": "Wallet",
  "Reference / note": "Reference",
  "Hidden network": "Hidden",
  "Issuer / authority": "Issuer",
  "Email target": "Email",
  "Phone number": "Phone",
  Recipient: "Recipient",
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-[#86cf7533] bg-[#86cf751a] text-[#b8efab]",
  medium: "border-[#f5c16c33] bg-[#f5c16c1f] text-[#ffd489]",
  high: "border-[#fb504733] bg-[#fb50471a] text-[#ff9c97]",
  unknown: "border-[#9bcbea33] bg-[#9bcbea1a] text-[#c9e8fb]",
};

export function ResultPanel({
  result,
  sourceLabel,
  developerMode,
  submittedReport,
  onBack,
  onOpenDestination,
  onOpenReport,
  onReset,
  onCopyPayload,
  openLabel,
}: ResultPanelProps) {
  const verdictLevel = result.verdict?.level ?? "informational";
  const hero = verdictCopy[verdictLevel];
  const headline = getHeadline(result, hero.title);
  const visibleDetails = getVisibleDetails(result);
  const guidanceItems = getGuidanceItems(result);
  const nestedTags = Object.entries(result.debug?.nestedTags ?? {});

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-8 pt-6 sm:pt-8">
      <ScreenHeader
        title="QR result"
        onBack={onBack}
        rightSlot={
          submittedReport ? (
            <StatusChip label={`Reported: ${formatReportReason(submittedReport.reason)}`} />
          ) : null
        }
      />

      <div className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border ${hero.iconBorder} ${hero.iconTone}`}
          >
            {hero.icon}
          </div>
          <h1 className="mt-6 text-3xl font-semibold leading-7 text-white">
            {headline}
          </h1>
          <p className="mt-2 max-w-[260px] text-base leading-6 text-white/80">
            {getShortDescription(result, hero.subtitle)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <MetaChip label={formatDetectedType(result.detectedType)} />
          {result.scheme ? <MetaChip label={result.scheme} /> : null}
          <MetaChip label={`Confidence: ${capitalize(result.confidence)}`} />
          <MetaChip
            label={`Risk: ${capitalize(result.riskLevel)}`}
            className={riskStyles[result.riskLevel]}
          />
        </div>

        <div className="mt-6">
          <PreviewCard result={result} tone={getToneFromVerdict(verdictLevel)} />
        </div>

        <section className="mt-6">
          <SectionTitle>What this means</SectionTitle>
          <div className="mt-3">
            <InfoCard>{result.plainLanguage ?? result.summary}</InfoCard>
          </div>
        </section>

        {visibleDetails.length ? (
          <section className="mt-6">
            <SectionTitle>Details</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {visibleDetails.map((detail) => (
                <FactRow key={detail.label} detail={detail} />
              ))}
            </div>
          </section>
        ) : null}

        {guidanceItems.length ? (
          <section className="mt-6">
            <SectionTitle>Before you continue</SectionTitle>
            <div className="mt-3 space-y-2">
              {guidanceItems.map((item) => (
                <InfoCard key={item}>{item}</InfoCard>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <SectionTitle>Full QR content</SectionTitle>
          <div className="mt-3 rounded-[18px] border border-[#9bcbea33] bg-[#9bcbea1a] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Everything inside the QR code</p>
              <button
                type="button"
                onClick={onCopyPayload}
                className="rounded-full border border-[#9bcbea33] bg-transparent px-3 py-1.5 text-xs font-medium text-[#9bcbea] transition hover:bg-[#9bcbea12]"
              >
                Copy
              </button>
            </div>
            <p className="mt-1 text-sm text-white/55">Source: {sourceLabel}</p>
            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-[14px] bg-[#07121b] px-4 py-3 text-xs leading-6 text-white/75">
              {result.rawPayload}
            </pre>
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle>Report</SectionTitle>
          <div className="mt-3 rounded-[18px] border border-[#fb504733] bg-[#fb504712] p-4">
            {submittedReport ? (
              <>
                <p className="text-sm font-medium text-white">Your report is saved.</p>
                <p className="mt-2 text-sm leading-5 text-white/60">
                  This prototype keeps the report only in the current session.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <FactRow
                    detail={{
                      label: "Category",
                      value: formatReportReason(submittedReport.reason),
                    }}
                  />
                  <FactRow
                    detail={{
                      label: "Title",
                      value: submittedReport.suggestedName,
                    }}
                  />
                  {submittedReport.comment ? (
                    <div className="sm:col-span-2">
                      <FactRow
                        detail={{
                          label: "Note",
                          value: submittedReport.comment,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white">
                  If this looks dangerous or misleading, report it so it can be reviewed.
                </p>
                <p className="mt-2 text-sm leading-5 text-white/60">
                  Reporting is local to this prototype session for now.
                </p>
              </>
            )}
            <div className="mt-4">
              <ActionButton
                accent="danger"
                label={submittedReport ? "Edit report" : "Report"}
                icon={<FlagIcon className="h-5 w-5" />}
                onClick={onOpenReport}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle>Actions</SectionTitle>
          <div className="mt-3 flex flex-col gap-3">
            {onOpenDestination ? (
              <ActionButton
                primary
                label={openLabel}
                icon={<ArrowUpRightIcon className="h-5 w-5" />}
                onClick={onOpenDestination}
              />
            ) : null}

            <ActionButton
              label="New analysis"
              icon={<ArrowLeftIcon className="h-5 w-5" />}
              onClick={onReset}
            />
          </div>
        </section>

        {developerMode && result.debug ? (
          <details className="mt-4 rounded-[18px] border border-[#9bcbea33] bg-[#9bcbea1a]">
            <summary className="cursor-pointer px-4 py-4 text-sm font-medium text-white">
              Technical details
            </summary>

            <div className="space-y-4 border-t border-[#9bcbea1f] px-4 py-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <TechnicalCard label="Matched by" value={result.debug.matchedBy} />
                <TechnicalCard
                  label="Confidence"
                  value={capitalize(result.confidence)}
                />
                <TechnicalCard label="Risk" value={capitalize(result.riskLevel)} />
                <TechnicalCard label="Source" value={sourceLabel} />
              </div>

              <section>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                  Detection steps
                </p>
                <div className="mt-3 space-y-2">
                  {result.debug.steps.map((step, index) => (
                    <InfoCard key={`${index}-${step}`}>{step}</InfoCard>
                  ))}
                </div>
              </section>

              {result.debug.heuristics?.length ? (
                <section>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Heuristics
                  </p>
                  <div className="mt-3 space-y-2">
                    {result.debug.heuristics.map((item) => (
                      <InfoCard key={item}>{item}</InfoCard>
                    ))}
                  </div>
                </section>
              ) : null}

              {result.debug.crc ? (
                <section>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    CRC
                  </p>
                  <div className="mt-3 rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea1a] p-4 text-sm text-white/75">
                    <p>Present: {result.debug.crc.present ? "Yes" : "No"}</p>
                    <p>Expected: {result.debug.crc.expected ?? "Not provided"}</p>
                    <p>
                      Calculated: {result.debug.crc.calculated ?? "Not calculated"}
                    </p>
                    <p>
                      Valid:{" "}
                      {typeof result.debug.crc.valid === "boolean"
                        ? result.debug.crc.valid
                          ? "Yes"
                          : "No"
                        : "Unknown"}
                    </p>
                    <p className="mt-2 text-white/55">{result.debug.crc.message}</p>
                  </div>
                </section>
              ) : null}

              {result.debug.topLevelTags?.length ? (
                <TlvTable
                  title="Top-level TLV tags"
                  nodes={result.debug.topLevelTags}
                />
              ) : null}

              {nestedTags.length
                ? nestedTags.map(([parentTag, nodes]) => (
                    <TlvTable
                      key={parentTag}
                      title={`Nested TLV tags inside ${parentTag}`}
                      nodes={nodes}
                    />
                  ))
                : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function ScreenHeader({
  title,
  onBack,
  rightSlot,
}: {
  title: string;
  onBack: () => void;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <IconButton onClick={onBack} ariaLabel="Back">
        <ArrowLeftIcon className="h-5 w-5" />
      </IconButton>
      <p className="flex-1 text-center text-base font-medium leading-6 text-white">
        {title}
      </p>
      <div className="flex min-w-11 items-center justify-end">{rightSlot}</div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#38647f] bg-[linear-gradient(118deg,#214e69_25%,#17394f_94%)] text-white transition hover:opacity-90"
    >
      {children}
    </button>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#9bcbea33] bg-[#9bcbea1a] px-3 py-1 text-xs font-medium text-[#9bcbea]">
      {label}
    </span>
  );
}

function MetaChip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full border border-[#9bcbea33] bg-[#9bcbea1a] px-3 py-1 text-xs font-medium text-[#c9e8fb] ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.18em] text-white/50">{children}</p>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  primary = false,
  accent = "default",
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  primary?: boolean;
  accent?: "default" | "danger";
}) {
  const styles = primary
    ? "border-transparent bg-[#9bcbea] text-[#0e2838] hover:bg-[#a8d5f1]"
    : accent === "danger"
      ? "border-[#fb5047] bg-[#fb504714] text-[#ff9c97] hover:bg-[#fb504726]"
      : "border-[#9bcbea] bg-transparent text-[#9bcbea] hover:bg-[#9bcbea12]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border px-4 text-base font-semibold transition ${styles}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FactRow({ detail }: { detail: QRInspectionDetail }) {
  return (
    <div className="rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea1a] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
        {detail.label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-white">
        {detail.value}
      </p>
    </div>
  );
}

function InfoCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea1a] px-4 py-3 text-sm leading-5 text-white/75">
      {children}
    </div>
  );
}

function TechnicalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea1a] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-white">
        {value}
      </p>
    </div>
  );
}

function TlvTable({ title, nodes }: { title: string; nodes: TLVNode[] }) {
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.18em] text-white/50">{title}</p>
      <div className="mt-3 space-y-2 md:hidden">
        {nodes.map((node) => (
          <div
            key={`${node.tag}-${node.start}`}
            className="rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea1a] px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-white/75">{node.tag}</span>
              <span className="text-xs text-white/45">Len {node.length}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-white/45">
              {node.label ?? "Unlabeled"}
            </p>
            <p className="mt-2 break-all text-xs text-white/75">
              {truncateValue(node.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 hidden overflow-hidden rounded-[16px] border border-[#9bcbea33] md:block">
        <table className="min-w-full divide-y divide-[#9bcbea1f] text-left text-xs text-white/75">
          <thead className="bg-[#9bcbea1a] text-white/45">
            <tr>
              <th className="px-3 py-2 font-medium">Tag</th>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Length</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#9bcbea1f] bg-[#9bcbea12]">
            {nodes.map((node) => (
              <tr key={`${node.tag}-${node.start}`}>
                <td className="px-3 py-2 font-mono">{node.tag}</td>
                <td className="px-3 py-2">{node.label ?? "Unlabeled"}</td>
                <td className="px-3 py-2">{node.length}</td>
                <td className="px-3 py-2 break-all">{truncateValue(node.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getHeadline(result: QRInspectionResult, fallback: string): string {
  const domain = getDetail(result, "Domain")?.replace(/^www\./, "");
  const merchant = getDetail(result, "Merchant name");
  const ssid = getDetail(result, "SSID");

  if (result.verdict?.level === "safe") {
    return "Safe";
  }

  if (result.detectedType === "Payment QR" && merchant) {
    return "Payment detected";
  }

  if (result.detectedType === "Wi-Fi configuration" && ssid) {
    return "Wi-Fi detected";
  }

  if (result.detectedType === "Website link" && domain) {
    return domain;
  }

  return fallback;
}

function getShortDescription(result: QRInspectionResult, fallback: string): string {
  const domain = getDetail(result, "Domain")?.replace(/^www\./, "");
  const merchant = getDetail(result, "Merchant name");
  const amount = getDetail(result, "Amount");
  const ssid = getDetail(result, "SSID");

  if (result.detectedType === "Website link" && domain) {
    if (result.verdict?.level === "safe") {
      return `${domain} looks low risk from the QR data.`;
    }

    if (result.verdict?.level === "scam") {
      return `${domain} shows strong scam or phishing signs.`;
    }

    return `${domain} should be checked carefully before you open it.`;
  }

  if (result.detectedType === "Payment QR" && merchant) {
    return amount
      ? `${merchant} is asking for ${amount}. Verify the receiver before you pay.`
      : `${merchant} is asking for a payment. Verify the receiver before you pay.`;
  }

  if (result.detectedType === "Wi-Fi configuration" && ssid) {
    return `${ssid} can be added as a Wi-Fi network from this QR code.`;
  }

  return result.plainLanguage ?? fallback;
}

function getVisibleDetails(result: QRInspectionResult): QRInspectionDetail[] {
  const detailsByLabel = new Map(result.details.map((detail) => [detail.label, detail]));
  const selected: QRInspectionDetail[] = [];
  const preferred = detailPriority[result.detectedType] ?? [];

  for (const label of preferred) {
    const detail = detailsByLabel.get(label);
    if (!detail) {
      continue;
    }

    selected.push(formatDetail(detail));
    detailsByLabel.delete(label);
  }

  for (const detail of result.details) {
    if (!detailsByLabel.has(detail.label) || hiddenDetailLabels.has(detail.label)) {
      continue;
    }

    selected.push(formatDetail(detail));
    detailsByLabel.delete(detail.label);
  }

  return selected;
}

function getGuidanceItems(result: QRInspectionResult): string[] {
  const items = [...(result.recommendedActions ?? []), ...result.safetyNotes];
  return Array.from(new Set(items)).slice(0, 4);
}

function formatDetail(detail: QRInspectionDetail): QRInspectionDetail {
  if (detail.label === "Password") {
    return {
      label: "Password",
      value:
        detail.value === "Not provided"
          ? "Not included"
          : "Included, but hidden from view",
    };
  }

  return {
    label: detailLabels[detail.label] ?? detail.label,
    value: detail.value,
  };
}

function getDetail(result: QRInspectionResult, label: string): string | undefined {
  return result.details.find((detail) => detail.label === label)?.value;
}

function formatDetectedType(detectedType: string): string {
  switch (detectedType) {
    case "Website link":
      return "Website";
    case "Document or file link":
      return "Document link";
    case "App store link":
      return "App store";
    case "Location link":
      return "Location";
    case "Payment QR":
      return "Payment";
    case "Crypto payment or wallet":
      return "Crypto";
    case "Wi-Fi configuration":
      return "Wi-Fi";
    case "Contact card":
      return "Contact";
    case "Email action":
      return "Email";
    case "Phone or messaging action":
      return "Phone or message";
    case "Calendar event":
      return "Calendar";
    case "Document / verification data (possible)":
      return "Document data";
    case "Government / identity / official data (possible)":
      return "Official data";
    case "Signed token / verification data":
      return "Verification token";
    default:
      return detectedType;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncateValue(value: string): string {
  if (value.length <= 72) {
    return value;
  }

  return `${value.slice(0, 72)}…`;
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3 5 6v5c0 4.3 2.7 8.2 7 9.8 4.3-1.6 7-5.5 7-9.8V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12.3 2.2 2.2 4.8-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4.5 3.5 19h17L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10.5v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 20V5m0 0h9l-1.5 3L15 11H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15 18 9 12l6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
