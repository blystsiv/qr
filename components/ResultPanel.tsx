import type { ReactNode } from "react";
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
  "Website link": ["Domain", "Known domain", "Normalized URL"],
  "Document or file link": ["Known domain", "Normalized URL"],
  "App store link": ["Known domain", "Normalized URL"],
  "Location link": ["Label", "Coordinates"],
  "Payment QR": [
    "Merchant name",
    "Amount",
    "Currency",
    "Payment address",
    "PayPal target",
    "Reference / note",
    "Reference",
  ],
  "Crypto payment or wallet": ["Wallet / payment target", "Amount", "Label"],
  "Wi-Fi configuration": ["SSID", "Encryption", "Hidden network", "Password"],
  "Email action": ["Email target", "Subject"],
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
  "Text note": ["Preview", "Length", "Words", "Lines"],
};

const hiddenDetailLabels = new Set([
  "Normalization",
  "Query params",
  "Matched markers",
  "Top-level keys",
  "CRC valid",
  "CRC status",
  "Provider markers",
  "Payload format",
  "Provider",
  "Path",
  "Link kind",
  "Normalized URL",
]);

const detailLabels: Record<string, string> = {
  "Normalized URL": "Destination",
  "Link kind": "Type",
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

type ResultTheme = {
  glow: string;
  surface: string;
  ring: string;
  badge: string;
  badgeText: string;
  icon: ReactNode;
  iconRing: string;
};

type SpotlightContent = {
  kicker: string;
  title: string;
  subtitle?: string;
  badges?: string[];
  address?: string;
  addressLabel?: string;
  rows?: QRInspectionDetail[];
  shownLabels?: string[];
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
  const theme = getResultTheme(result);
  const spotlight = getSpotlightContent(result);
  const headline = getHeadline(result, hero.title);
  const visibleDetails = getVisibleDetails(result, spotlight?.shownLabels);
  const guidanceItems = getGuidanceItems(result);
  const metaChips = getMetaChips(result);
  const nestedTags = Object.entries(result.debug?.nestedTags ?? {});

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden px-4 pb-8 pt-6 sm:pt-8">
      <div
        className="pointer-events-none absolute inset-x-[-20%] top-[-72px] h-64 blur-3xl"
        style={{
          background: `radial-gradient(circle at top, ${theme.glow} 0%, transparent 70%)`,
        }}
      />
      <ScreenHeader
        title="QR result"
        onBack={onBack}
        rightSlot={
          submittedReport ? (
            <StatusChip label={`Reported: ${formatReportReason(submittedReport.reason)}`} />
          ) : null
        }
      />

      <div className="relative mt-8 flex flex-1 flex-col">
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
          {metaChips.map((chip) => (
            <MetaChip key={chip.label} label={chip.label} className={chip.className} />
          ))}
        </div>

        <ResultSpotlight theme={theme} content={spotlight} />

        <section className="mt-6">
          <SectionTitle>What this means</SectionTitle>
          <div className="mt-3">
            <InfoCard>{result.plainLanguage ?? result.summary}</InfoCard>
          </div>
        </section>

        {visibleDetails.length ? (
          <section className="mt-6">
            <SectionTitle>Important details</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {visibleDetails.map((detail) => (
                <FactRow key={detail.label} detail={detail} />
              ))}
            </div>
          </section>
        ) : null}

        {guidanceItems.length ? (
          <section className="mt-6">
            <SectionTitle>What to do next</SectionTitle>
            <div className="mt-3 space-y-2">
              {guidanceItems.map((item) => (
                <InfoCard key={item}>{item}</InfoCard>
              ))}
            </div>
          </section>
        ) : null}

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
              label="Scan another QR"
              icon={<ArrowLeftIcon className="h-5 w-5" />}
              onClick={onReset}
            />
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle>Report</SectionTitle>
          <SectionCard tone="danger">
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
          </SectionCard>
        </section>

        <details className="mt-6 rounded-[18px] border border-[#9bcbea26] bg-[#9bcbea0d]">
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-white marker:hidden">
            <span className="flex items-center justify-between gap-3">
              <span>Show full QR text</span>
              <span className="text-xs text-white/45">Tap to expand</span>
            </span>
          </summary>
          <div className="border-t border-[#9bcbea1f] px-4 py-4">
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
            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-[14px] bg-[#07121b] px-4 py-3 text-xs leading-6 text-white/75">
              {result.rawPayload}
            </pre>
          </div>
        </details>

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

function SectionCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "border-[#fb504733] bg-[#fb504712]"
      : "border-[#9bcbea33] bg-[#9bcbea1a]";

  return <div className={`mt-3 rounded-[18px] border p-4 ${styles}`}>{children}</div>;
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

function getResultTheme(result: QRInspectionResult): ResultTheme {
  if (result.detectedType === "Crypto payment or wallet") {
    const protocol = (result.scheme ?? "").toLowerCase();

    if (protocol === "bitcoin") {
      return {
        glow: "rgba(247,147,26,0.35)",
        surface: "rgba(247,147,26,0.11)",
        ring: "border-[#f7931a55]",
        badge: "bg-[#f7931a]",
        badgeText: "text-[#0e2838]",
        icon: <CoinIcon className="h-5 w-5" />,
        iconRing: "border-[#f7b55a]",
      };
    }

    if (protocol === "ethereum") {
      return {
        glow: "rgba(98,126,234,0.34)",
        surface: "rgba(98,126,234,0.11)",
        ring: "border-[#627eea55]",
        badge: "bg-[#627eea]",
        badgeText: "text-white",
        icon: <DiamondIcon className="h-5 w-5" />,
        iconRing: "border-[#8ea0ef]",
      };
    }

    return {
      glow: "rgba(110,231,183,0.28)",
      surface: "rgba(16,185,129,0.11)",
      ring: "border-[#10b98155]",
      badge: "bg-[#10b981]",
      badgeText: "text-[#0e2838]",
      icon: <CoinIcon className="h-5 w-5" />,
      iconRing: "border-[#6ee7b7]",
    };
  }

  if (result.detectedType === "Payment QR") {
    return {
      glow: "rgba(245,193,108,0.28)",
      surface: "rgba(245,193,108,0.11)",
      ring: "border-[#f5c16c55]",
      badge: "bg-[#f5c16c]",
      badgeText: "text-[#0e2838]",
      icon: <CardIcon className="h-5 w-5" />,
      iconRing: "border-[#ffd489]",
    };
  }

  if (result.detectedType === "Wi-Fi configuration") {
    return {
      glow: "rgba(45,212,191,0.28)",
      surface: "rgba(45,212,191,0.11)",
      ring: "border-[#2dd4bf55]",
      badge: "bg-[#2dd4bf]",
      badgeText: "text-[#0e2838]",
      icon: <WifiIcon className="h-5 w-5" />,
      iconRing: "border-[#75efe0]",
    };
  }

  if (
    ["Contact card", "Calendar event", "Email action", "Phone or messaging action"].includes(
      result.detectedType,
    )
  ) {
    return {
      glow: "rgba(96,165,250,0.26)",
      surface: "rgba(96,165,250,0.11)",
      ring: "border-[#60a5fa55]",
      badge: "bg-[#60a5fa]",
      badgeText: "text-[#0e2838]",
      icon: <PersonIcon className="h-5 w-5" />,
      iconRing: "border-[#9ac8ff]",
    };
  }

  if (
    [
      "Document / verification data (possible)",
      "Government / identity / official data (possible)",
      "Signed token / verification data",
    ].includes(result.detectedType)
  ) {
    return {
      glow: "rgba(168,85,247,0.25)",
      surface: "rgba(168,85,247,0.11)",
      ring: "border-[#a855f755]",
      badge: "bg-[#a855f7]",
      badgeText: "text-white",
      icon: <DocumentIcon className="h-5 w-5" />,
      iconRing: "border-[#c084fc]",
    };
  }

  if (
    result.detectedType === "Text note" ||
    result.detectedType === "Structured text or app-specific data"
  ) {
    return {
      glow: "rgba(148,163,184,0.22)",
      surface: "rgba(148,163,184,0.1)",
      ring: "border-[#94a3b855]",
      badge: "bg-[#94a3b8]",
      badgeText: "text-[#0e2838]",
      icon: <TextIcon className="h-5 w-5" />,
      iconRing: "border-[#c4cfdb]",
    };
  }

  return {
    glow: "rgba(155,203,234,0.28)",
    surface: "rgba(155,203,234,0.11)",
    ring: "border-[#9bcbea55]",
    badge: "bg-[#9bcbea]",
    badgeText: "text-[#0e2838]",
    icon:
      result.detectedType === "Location link" ? (
        <PinIcon className="h-5 w-5" />
      ) : (
        <LinkIcon className="h-5 w-5" />
      ),
    iconRing: "border-[#bce2f8]",
  };
}

function ResultSpotlight({
  theme,
  content,
}: {
  theme: ResultTheme;
  content: SpotlightContent | null;
}) {
  if (!content) {
    return null;
  }

  return (
    <section className="mt-6">
      <div
        className={`rounded-[22px] border p-4 shadow-[0_20px_60px_rgba(7,18,27,0.18)] ${theme.ring}`}
        style={{ background: theme.surface }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${theme.iconRing} ${theme.badge} ${theme.badgeText}`}
          >
            {theme.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              {content.kicker}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold leading-6 text-white">
              {content.title}
            </h2>
            {content.subtitle ? (
              <p className="mt-2 text-sm leading-6 text-white/70">
                {content.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {content.badges?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {content.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-[#07121b66] px-3 py-1 text-xs font-medium text-white/75"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {content.address ? (
          <div className="mt-4 rounded-[16px] border border-white/10 bg-[#07121b] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              {content.addressLabel ?? "Value"}
            </p>
            <p className="mt-2 break-all font-mono text-sm leading-6 text-white/80">
              {content.address}
            </p>
          </div>
        ) : null}

        {content.rows?.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {content.rows.map((row) => (
              <FactRow key={`${row.label}-${row.value}`} detail={row} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getSpotlightContent(result: QRInspectionResult): SpotlightContent | null {
  const domain = getDetail(result, "Domain");
  const provider = getDetail(result, "Provider");
  const linkKind = getDetail(result, "Link kind");
  const destination = getDetail(result, "Normalized URL");
  const merchant =
    getDetail(result, "Merchant name") ??
    getDetail(result, "PayPal target") ??
    getDetail(result, "Payment address");
  const amount = getDetail(result, "Amount");
  const currency = getDetail(result, "Currency");
  const wallet = getDetail(result, "Wallet / payment target");
  const protocol = getDetail(result, "Protocol") ?? result.scheme;
  const ssid = getDetail(result, "SSID");
  const encryption = getDetail(result, "Encryption");
  const name = getDetail(result, "Name");
  const email = getDetail(result, "Email") ?? getDetail(result, "Email target");
  const phone = getDetail(result, "Phone") ?? getDetail(result, "Phone number");
  const summary = getDetail(result, "Summary");
  const starts = getDetail(result, "Starts");
  const issuer =
    getDetail(result, "Issuer / authority") ?? getDetail(result, "Issuer");
  const preview = getDetail(result, "Preview");
  const coordinates = getDetail(result, "Coordinates");
  const label = getDetail(result, "Label");

  if (
    ["Website link", "Document or file link", "App store link", "Location link"].includes(
      result.detectedType,
    )
  ) {
    return {
      kicker: formatDetectedType(result.detectedType),
      title: provider ?? domain ?? "Link destination",
      subtitle: label ?? linkKind ?? result.plainLanguage ?? result.summary,
      badges: [linkKind, provider, result.scheme].filter(Boolean) as string[],
      address: destination,
      addressLabel:
        result.detectedType === "Location link" ? "Open destination" : "Destination",
      rows: [
        ...(domain ? [{ label: "Domain", value: domain }] : []),
        ...(coordinates ? [{ label: "Coordinates", value: coordinates }] : []),
      ],
      shownLabels: [
        "Domain",
        "Coordinates",
        "Normalized URL",
        "Provider",
        "Link kind",
        "Label",
      ],
    };
  }

  if (result.detectedType === "Payment QR") {
    return {
      kicker: result.scheme ?? "Payment",
      title: merchant ?? "Payment request",
      subtitle: amount
        ? `${amount}${currency ? ` ${currency}` : ""} requested in this QR code.`
        : "Payment details detected in this QR code.",
      badges: [result.scheme, currency].filter(Boolean) as string[],
      rows: pickDetails(result, ["Amount", "Currency", "Country", "City", "Reference"]),
      shownLabels: [
        "Merchant name",
        "PayPal target",
        "Payment address",
        "Amount",
        "Currency",
        "Country",
        "City",
        "Reference",
      ],
    };
  }

  if (result.detectedType === "Crypto payment or wallet") {
    return {
      kicker: "Crypto wallet",
      title: protocol ? `${protocol} wallet` : "Crypto wallet",
      subtitle: amount
        ? `${amount} requested on ${protocol ?? "this network"}.`
        : "Crypto wallet or payment details detected in this QR code.",
      badges: [protocol, amount].filter(Boolean) as string[],
      address: wallet,
      addressLabel: "Wallet address",
      rows: pickDetails(result, ["Amount", "Label"]),
      shownLabels: ["Wallet / payment target", "Amount", "Label", "Protocol"],
    };
  }

  if (result.detectedType === "Wi-Fi configuration") {
    return {
      kicker: "Wi-Fi network",
      title: ssid ?? "Unknown network",
      subtitle: encryption ? `${encryption} network details detected.` : result.summary,
      badges: [encryption, getDetail(result, "Hidden network")].filter(Boolean) as string[],
      rows: pickDetails(result, ["Encryption", "Hidden", "Password"]),
      shownLabels: ["SSID", "Encryption", "Hidden network", "Password"],
    };
  }

  if (result.detectedType === "Contact card") {
    return {
      kicker: "Contact card",
      title: name ?? "Contact details",
      subtitle: getDetail(result, "Organization") ?? "Contact information detected.",
      rows: [
        ...(phone ? [{ label: "Phone", value: phone }] : []),
        ...(email ? [{ label: "Email", value: email }] : []),
      ],
      shownLabels: ["Name", "Organization", "Phone", "Phone number", "Email", "Email target"],
    };
  }

  if (result.detectedType === "Calendar event") {
    return {
      kicker: "Calendar event",
      title: summary ?? "Event details",
      subtitle: starts ? `Starts ${starts}.` : result.summary,
      rows: pickDetails(result, ["Starts", "Ends", "Location"]),
      shownLabels: ["Summary", "Starts", "Ends", "Location"],
    };
  }

  if (result.detectedType === "Email action") {
    return {
      kicker: "Email draft",
      title: email ?? "Email action",
      subtitle: getDetail(result, "Subject") ?? result.summary,
      rows: pickDetails(result, ["Subject", "Body"]),
      shownLabels: ["Email target", "Subject", "Body"],
    };
  }

  if (result.detectedType === "Phone or messaging action") {
    return {
      kicker: result.scheme ?? "Message action",
      title: phone ?? getDetail(result, "Recipient") ?? "Phone or message",
      subtitle: getDetail(result, "Message body") ?? result.summary,
      rows: pickDetails(result, ["Recipient", "Message body"]),
      shownLabels: ["Phone number", "Recipient", "Message body"],
    };
  }

  if (
    [
      "Document / verification data (possible)",
      "Government / identity / official data (possible)",
      "Signed token / verification data",
    ].includes(result.detectedType)
  ) {
    return {
      kicker: formatDetectedType(result.detectedType),
      title: issuer ?? "Verification data",
      subtitle: getDetail(result, "Type") ?? result.summary,
      rows: pickDetails(result, ["Type", "Identifier", "Expires", "Subject"]),
      shownLabels: ["Issuer / authority", "Issuer", "Type", "Identifier", "Expires", "Subject"],
    };
  }

  if (result.detectedType === "Text note") {
    return {
      kicker: "Text note",
      title: "Plain text",
      subtitle: "This QR contains text instead of a link or action.",
      address: preview,
      addressLabel: "Text preview",
      rows: pickDetails(result, ["Length", "Words", "Lines"]),
      shownLabels: ["Preview", "Length", "Words", "Lines"],
    };
  }

  return null;
}

function pickDetails(result: QRInspectionResult, labels: string[]): QRInspectionDetail[] {
  return labels
    .map((label) => result.details.find((detail) => detail.label === label))
    .filter((detail): detail is QRInspectionDetail => Boolean(detail))
    .map((detail) => formatDetail(detail));
}

function getHeadline(result: QRInspectionResult, fallback: string): string {
  const domain = getDetail(result, "Domain")?.replace(/^www\./, "");
  const merchant = getDetail(result, "Merchant name");
  const ssid = getDetail(result, "SSID");
  const protocol = getDetail(result, "Protocol") ?? result.scheme;
  const name = getDetail(result, "Name");
  const summary = getDetail(result, "Summary");

  if (result.verdict?.level === "safe") {
    return "Safe";
  }

  if (result.detectedType === "Payment QR" && merchant) {
    return "Payment detected";
  }

  if (result.detectedType === "Wi-Fi configuration" && ssid) {
    return "Wi-Fi detected";
  }

  if (result.detectedType === "Crypto payment or wallet" && protocol) {
    return `${protocol} wallet`;
  }

  if (result.detectedType === "Contact card" && name) {
    return name;
  }

  if (result.detectedType === "Calendar event" && summary) {
    return summary;
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
  const protocol = getDetail(result, "Protocol") ?? result.scheme;
  const summary = getDetail(result, "Summary");
  const recipient = getDetail(result, "Recipient") ?? getDetail(result, "Phone number");

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

  if (result.detectedType === "Crypto payment or wallet" && protocol) {
    return amount
      ? `${protocol} payment details are included in this QR code for ${amount}.`
      : `${protocol} wallet details are included in this QR code.`;
  }

  if (result.detectedType === "Contact card") {
    return "This QR contains contact details that can be saved to another app.";
  }

  if (result.detectedType === "Calendar event" && summary) {
    return `This QR contains an event called "${summary}".`;
  }

  if (result.detectedType === "Email action") {
    return "This QR opens an email draft.";
  }

  if (result.detectedType === "Phone or messaging action" && recipient) {
    return `This QR opens a call or message action for ${recipient}.`;
  }

  if (result.detectedType === "Text note") {
    return "This QR contains plain text only.";
  }

  return result.plainLanguage ?? fallback;
}

function getVisibleDetails(
  result: QRInspectionResult,
  spotlightLabels: string[] = [],
): QRInspectionDetail[] {
  const detailsByLabel = new Map(result.details.map((detail) => [detail.label, detail]));
  const selected: QRInspectionDetail[] = [];
  const preferred = detailPriority[result.detectedType] ?? [];
  const spotlightLabelSet = new Set(spotlightLabels);

  for (const label of preferred) {
    const detail = detailsByLabel.get(label);
    if (!detail || spotlightLabelSet.has(label)) {
      continue;
    }

    selected.push(formatDetail(detail));
    detailsByLabel.delete(label);
  }

  for (const detail of result.details) {
    if (
      !detailsByLabel.has(detail.label) ||
      hiddenDetailLabels.has(detail.label) ||
      spotlightLabelSet.has(detail.label)
    ) {
      continue;
    }

    selected.push(formatDetail(detail));
    detailsByLabel.delete(detail.label);
  }

  return selected.slice(0, 4);
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

function getMetaChips(
  result: QRInspectionResult,
): Array<{ label: string; className?: string }> {
  const chips: Array<{ label: string; className?: string }> = [
    { label: formatDetectedType(result.detectedType) },
  ];

  if (
    result.scheme &&
    ["Payment QR", "Crypto payment or wallet", "Phone or messaging action"].includes(
      result.detectedType,
    )
  ) {
    chips.push({ label: result.scheme });
  }

  if (
    result.riskLevel === "medium" ||
    result.riskLevel === "high" ||
    result.verdict?.level === "suspicious" ||
    result.verdict?.level === "scam"
  ) {
    chips.push({
      label: `Risk: ${capitalize(result.riskLevel)}`,
      className: riskStyles[result.riskLevel],
    });
  }

  return chips;
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
    case "Text note":
      return "Text";
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10.5 13.5 13.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 15a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 5l-.5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 9a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 1 1-5-5l.5-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 20s6-4.6 6-10a6 6 0 1 0-12 0c0 5.4 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10.5h17" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M10 9.5h3a1.5 1.5 0 1 1 0 3h-2a1.5 1.5 0 1 0 0 3h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4 7 11l5 9 5-9-5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7 11h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 9.5a12 12 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 13a8 8 0 0 1 10 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 16.5a4.5 4.5 0 0 1 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 20V5A1.5 1.5 0 0 1 8.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 12h4M10 15.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
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
