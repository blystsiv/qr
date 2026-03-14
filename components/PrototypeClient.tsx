"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraScanner } from "@/components/CameraScanner";
import { PreviewCard, buildPreviewInfo, getToneFromVerdict } from "@/components/PreviewCard";
import { ResultPanel } from "@/components/ResultPanel";
import { classifyQR } from "@/lib/classifyQR";
import {
  formatReportReason,
  getDefaultReportReason,
  getReportContext,
  type ReportDraft,
} from "@/lib/reporting";
import { samplePayloads } from "@/lib/samples/payloads";
import type { QRInspectionResult } from "@/lib/types/qr";

type Screen = "scan" | "result" | "report";
type ToolMode = "upload" | "paste" | "sample";
type BannerTone = "neutral" | "success" | "warning";

type BannerState = {
  tone: BannerTone;
  message: string;
} | null;

const bannerStyles: Record<BannerTone, string> = {
  neutral: "border-[#9bcbea33] bg-[#9bcbea1f] text-white/80",
  success: "border-[#86cf7533] bg-[#86cf751a] text-white/85",
  warning: "border-[#fb504733] bg-[#fb50471a] text-white/85",
};

const featuredSampleIds = [
  "safe-website",
  "qris",
  "bitcoin",
  "wifi",
  "document-json",
];
const reportCommentMaxLength = 280;

export function PrototypeClient() {
  const uploadReaderId = useId().replace(/:/g, "_");
  const [screen, setScreen] = useState<Screen>("scan");
  const [toolMode, setToolMode] = useState<ToolMode>("upload");
  const [showTools, setShowTools] = useState(false);
  const [payload, setPayload] = useState("");
  const [draftPayload, setDraftPayload] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Camera scan");
  const [developerMode, setDeveloperMode] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<ReportDraft | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);
  const [uploadStatus, setUploadStatus] = useState(
    "Select an image file with a QR code.",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft>({
    suggestedName: "",
    comment: "",
    reason: "scam",
  });

  const featuredSamples = useMemo(
    () =>
      featuredSampleIds
        .map((sampleId) => samplePayloads.find((sample) => sample.id === sampleId))
        .filter(
          (sample): sample is (typeof samplePayloads)[number] => sample !== undefined,
        ),
    [],
  );

  const result = useMemo<QRInspectionResult>(() => classifyQR(payload), [payload]);
  const openTarget = useMemo(() => resolveOpenTarget(result), [result]);

  function applyPayload(nextPayload: string, source: string) {
    setPayload(nextPayload);
    setDraftPayload(nextPayload);
    setSourceLabel(source);
    setSubmittedReport(null);
    setScreen(nextPayload.trim() ? "result" : "scan");
    setShowTools(false);
  }

  function resetAnalysis() {
    setPayload("");
    setDraftPayload("");
    setSourceLabel("Camera scan");
    setSubmittedReport(null);
    setBanner({
      tone: "neutral",
      message: "Ready for another scan.",
    });
    setScreen("scan");
  }

  function openReportScreen() {
    const preview = buildPreviewInfo(result);
    const reportContext = getReportContext(result);
    const fallbackTitle = preview.title.trim() || reportContext.namePlaceholder;

    setReportDraft({
      suggestedName: submittedReport?.suggestedName ?? fallbackTitle,
      comment: submittedReport?.comment ?? "",
      reason: submittedReport?.reason ?? getDefaultReportReason(result),
    });

    setScreen("report");
  }

  function submitReport() {
    const reportContext = getReportContext(result);
    const normalizedReport: ReportDraft = {
      suggestedName:
        reportDraft.suggestedName.trim() || reportContext.namePlaceholder,
      comment: reportDraft.comment.trim(),
      reason: reportDraft.reason,
    };

    setSubmittedReport(normalizedReport);
    setReportDraft(normalizedReport);
    setBanner({
      tone: "success",
      message: `${formatReportReason(normalizedReport.reason)} report saved locally for this session.`,
    });
    setScreen("result");
  }

  function openToolsPanel(mode: ToolMode) {
    setShowTools(true);
    setToolMode(mode);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    setUploadStatus(`Scanning ${file.name}...`);

    let reader: Html5Qrcode | null = null;

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode"
      );

      reader = new Html5Qrcode(uploadReaderId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedPayload = await reader.scanFile(file, false);
      applyPayload(decodedPayload, `Uploaded image: ${file.name}`);
      setUploadStatus(`Read ${file.name}.`);
      setBanner({
        tone: "success",
        message: "QR code read from the uploaded image.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The selected image could not be read.";

      setUploadError(message);
      setUploadStatus("No QR code was found in that image.");
    } finally {
      try {
        reader?.clear();
      } catch {
        // Ignore cleanup issues from the off-screen scanner instance.
      }

      event.target.value = "";
    }
  }

  function inspectDraftPayload() {
    applyPayload(draftPayload, "Pasted text");
    setBanner({
      tone: draftPayload.trim() ? "success" : "neutral",
      message: draftPayload.trim()
        ? "Pasted QR text inspected."
        : "Paste QR text to inspect it.",
    });
  }

  function loadSample(sampleId: string) {
    const sample = samplePayloads.find((entry) => entry.id === sampleId);
    if (!sample) {
      return;
    }

    applyPayload(sample.payload, `Sample: ${sample.label}`);
    setBanner({
      tone: "success",
      message: `${sample.label} loaded.`,
    });
  }

  async function copyPayload() {
    if (!payload.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      setBanner({
        tone: "success",
        message: "QR text copied.",
      });
    } catch {
      setBanner({
        tone: "warning",
        message: "Clipboard access is blocked in this browser.",
      });
    }
  }

  function openDestination() {
    if (!openTarget) {
      return;
    }

    window.open(openTarget, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#0e2838] text-white">
      {screen === "scan" ? (
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-8 pt-6 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="h-11 w-11" />
            <p className="flex-1 text-center text-base font-medium leading-6 text-white">
              Scan QR code
            </p>
            <IconButton
              onClick={() => setShowTools((current) => !current)}
              ariaLabel="Open prototype tools"
            >
              <DotsIcon className="h-5 w-5" />
            </IconButton>
          </div>

          <div className="mt-8 flex flex-1 flex-col">
            <CameraScanner
              active
              onDetected={(decodedPayload) => {
                applyPayload(decodedPayload, "Camera scan");
                setBanner({
                  tone: "success",
                  message: "QR code captured.",
                });
              }}
            />

            {showTools ? (
              <div className="mt-6 rounded-[18px] border border-[#9bcbea33] bg-[#9bcbea1a] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Prototype tools</p>
                  <label className="flex items-center gap-2 text-xs text-white/65">
                    <input
                      type="checkbox"
                      checked={developerMode}
                      onChange={(event) => setDeveloperMode(event.target.checked)}
                      className="h-4 w-4 rounded border-[#9bcbea55] bg-transparent text-[#9bcbea] focus:ring-0"
                    />
                    Technical details
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ToolTab
                    active={toolMode === "upload"}
                    label="Upload"
                    onClick={() => setToolMode("upload")}
                  />
                  <ToolTab
                    active={toolMode === "paste"}
                    label="Paste"
                    onClick={() => setToolMode("paste")}
                  />
                  <ToolTab
                    active={toolMode === "sample"}
                    label="Samples"
                    onClick={() => setToolMode("sample")}
                  />
                </div>

                {toolMode === "upload" ? (
                  <div className="mt-4 space-y-3">
                    <label className="block rounded-[16px] border border-dashed border-[#9bcbea33] bg-[#9bcbea14] p-4 text-sm text-white/65">
                      <span className="mb-2 block font-medium text-white">
                        Select a QR image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-[#9bcbea] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0e2838]"
                      />
                    </label>

                    <p className="text-sm text-white/65">{uploadStatus}</p>

                    {uploadError ? (
                      <div className="rounded-[16px] border border-[#fb504733] bg-[#fb50471a] px-4 py-3 text-sm text-white/80">
                        {uploadError}
                      </div>
                    ) : null}

                    <div id={uploadReaderId} className="h-0 overflow-hidden" />
                  </div>
                ) : null}

                {toolMode === "paste" ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={draftPayload}
                      onChange={(event) => setDraftPayload(event.target.value)}
                      placeholder="Paste decoded QR text here..."
                      className="min-h-[140px] w-full rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea14] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/35 focus:border-[#9bcbea66]"
                    />

                    <button
                      type="button"
                      onClick={inspectDraftPayload}
                      className="flex h-12 w-full items-center justify-center rounded-full bg-[#9bcbea] px-4 text-base font-semibold text-[#0e2838] transition hover:bg-[#a8d5f1]"
                    >
                      Inspect text
                    </button>
                  </div>
                ) : null}

                {toolMode === "sample" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {featuredSamples.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => loadSample(sample.id)}
                        className="rounded-full border border-[#9bcbea33] bg-[#9bcbea14] px-3 py-2 text-sm text-white/80 transition hover:bg-[#9bcbea22]"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <MiniPill label="Upload image" onClick={() => {
                  openToolsPanel("upload");
                }} />
                <MiniPill label="Paste text" onClick={() => {
                  openToolsPanel("paste");
                }} />
                <MiniPill label="Load sample" onClick={() => {
                  openToolsPanel("sample");
                }} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {screen === "result" ? (
        <ResultPanel
          result={result}
          sourceLabel={sourceLabel}
          developerMode={developerMode}
          submittedReport={submittedReport}
          onBack={resetAnalysis}
          onOpenDestination={openTarget ? openDestination : undefined}
          onOpenReport={openReportScreen}
          onReset={resetAnalysis}
          onCopyPayload={copyPayload}
          openLabel={resolveOpenLabel(result)}
        />
      ) : null}

      {screen === "report" ? (
        <ReportScreen
          result={result}
          draft={reportDraft}
          onBack={() => setScreen("result")}
          onChange={setReportDraft}
          onSubmit={submitReport}
        />
      ) : null}

      {banner ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-6 z-20 flex justify-center">
          <div
            className={`pointer-events-auto w-full max-w-[430px] rounded-[14px] border px-4 py-3 text-sm ${bannerStyles[banner.tone]}`}
          >
            {banner.message}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ReportScreen({
  result,
  draft,
  onBack,
  onChange,
  onSubmit,
}: {
  result: QRInspectionResult;
  draft: ReportDraft;
  onBack: () => void;
  onChange: (next: ReportDraft) => void;
  onSubmit: () => void;
}) {
  const preview = buildPreviewInfo(result);
  const visibleDetails = getReportDetails(result);
  const verdictLabel = result.verdict?.label ?? "Review";
  const reportContext = getReportContext(result);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-8 pt-6 sm:pt-8">
      <div className="flex items-center justify-between gap-3">
        <IconButton onClick={onBack} ariaLabel="Back to result">
          <ArrowLeftIcon className="h-5 w-5" />
        </IconButton>
        <p className="flex-1 text-center text-base font-medium leading-6 text-white">
          {reportContext.screenTitle}
        </p>
        <div className="h-11 w-11" />
      </div>

      <div className="mt-8 flex flex-1 flex-col">
        <PreviewCard result={result} tone={getToneFromVerdict(result.verdict?.level)} />

        <div className="mt-5 flex flex-wrap gap-2">
          <MetaPill label={verdictLabel} />
          <MetaPill label={result.detectedType} />
          {result.scheme ? <MetaPill label={result.scheme} /> : null}
        </div>

        <div className="mt-6 rounded-[18px] border border-[#9bcbea33] bg-[#9bcbea12] p-4">
          <p className="text-sm font-medium text-white">Why report this</p>
          <p className="mt-2 text-sm leading-6 text-white/75">
            {reportContext.intro}
          </p>
        </div>

        {visibleDetails.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleDetails.map((detail) => (
              <ReportFact key={detail.label} label={detail.label} value={detail.value} />
            ))}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <FormField label={reportContext.reasonLabel}>
            <div className="space-y-3">
              {reportContext.reasonOptions.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => onChange({ ...draft, reason: reason.value })}
                  className={`flex w-full items-start gap-3 rounded-[16px] border px-4 py-4 text-left transition ${
                    draft.reason === reason.value
                      ? "border-[#9bcbea66] bg-[#9bcbea1f]"
                      : "border-[#9bcbea33] bg-[#9bcbea14]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      draft.reason === reason.value
                        ? "border-[#9bcbea] bg-[#9bcbea]"
                        : "border-[#9bcbea66]"
                    }`}
                  >
                    {draft.reason === reason.value ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0e2838]" />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium text-white">{reason.label}</p>
                    <p className="mt-1 text-sm leading-5 text-white/55">
                      {reason.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={reportContext.nameLabel}>
            <input
              value={draft.suggestedName}
              onChange={(event) =>
                onChange({ ...draft, suggestedName: event.target.value })
              }
              placeholder={reportContext.namePlaceholder || preview.title}
              className="h-14 w-full rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea14] px-4 text-base text-white outline-none placeholder:text-[#9bcbea99] focus:border-[#9bcbea66]"
            />
          </FormField>

          <FormField label={reportContext.commentLabel}>
            <textarea
              value={draft.comment}
              onChange={(event) =>
                onChange({
                  ...draft,
                  comment: event.target.value.slice(0, reportCommentMaxLength),
                })
              }
              maxLength={reportCommentMaxLength}
              placeholder={reportContext.commentPlaceholder}
              className="min-h-[96px] w-full rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea14] px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-[#9bcbea99] focus:border-[#9bcbea66]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-white/50">
                {reportContext.privacyNote}
              </p>
              <p className="shrink-0 text-xs text-white/45">
                {draft.comment.length}/{reportCommentMaxLength}
              </p>
            </div>
          </FormField>

          <div className="rounded-[18px] border border-[#9bcbea33] bg-[#9bcbea12] p-4">
            <p className="text-sm font-medium text-white">Report preview</p>
            <div className="mt-3 space-y-3">
              <PreviewRow
                label="Category"
                value={formatReportReason(draft.reason)}
              />
              <PreviewRow
                label="Title"
                value={draft.suggestedName.trim() || reportContext.namePlaceholder}
              />
              <PreviewRow
                label="Note"
                value={draft.comment.trim() || "No extra note added."}
                multiline
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="mb-3 rounded-[16px] border border-[#fb504733] bg-[#fb504712] px-4 py-3 text-sm leading-5 text-white/70">
            Reports are saved only in this prototype session.
          </div>
          <button
            type="button"
            onClick={onSubmit}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#fb5047] px-4 text-base font-semibold text-white transition hover:bg-[#ff655d]"
          >
            <FlagIcon className="h-5 w-5" />
            <span>{reportContext.submitLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-base font-medium leading-6 text-white">{label}</p>
      {children}
    </div>
  );
}

function ToolTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#9bcbea] text-[#0e2838]"
          : "border border-[#9bcbea33] bg-[#9bcbea14] text-white/75"
      }`}
    >
      {label}
    </button>
  );
}

function MiniPill({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[#9bcbea33] bg-[#9bcbea14] px-3 py-2 text-sm text-white/75 transition hover:bg-[#9bcbea22]"
    >
      {label}
    </button>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#9bcbea33] bg-[#9bcbea1a] px-3 py-1 text-xs font-medium text-[#c9e8fb]">
      {label}
    </span>
  );
}

function ReportFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#9bcbea33] bg-[#9bcbea12] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-white">
        {value}
      </p>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[#9bcbea26] bg-[#07121b] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p
        className={`mt-2 text-sm leading-5 text-white ${multiline ? "whitespace-pre-wrap break-words" : "break-words"}`}
      >
        {value}
      </p>
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

function resolveOpenTarget(result: QRInspectionResult): string | null {
  const normalizedUrl = result.details.find(
    (detail) => detail.label === "Normalized URL",
  )?.value;

  if (normalizedUrl) {
    return normalizedUrl;
  }

  if (/^(https?:|mailto:|tel:|sms:|smsto:|geo:)/i.test(result.rawPayload)) {
    return result.rawPayload;
  }

  return null;
}

function resolveOpenLabel(result: QRInspectionResult): string {
  switch (result.detectedType) {
    case "Website link":
    case "Document or file link":
    case "App store link":
      return "Visit URL";
    case "Location link":
      return "Open location";
    case "Email action":
      return "Open email";
    case "Phone or messaging action":
      return "Open action";
    default:
      return "Open";
  }
}

function getReportDetails(result: QRInspectionResult): Array<{
  label: string;
  value: string;
}> {
  const preferredLabels = [
    "Domain",
    "Normalized URL",
    "Merchant name",
    "Amount",
    "Currency",
    "Country",
    "City",
    "Wallet / payment target",
    "SSID",
    "Encryption",
    "Name",
    "Email",
    "Phone",
    "Issuer / authority",
    "Type",
    "Identifier",
  ];

  return preferredLabels
    .map((label) => result.details.find((detail) => detail.label === label))
    .filter((detail): detail is { label: string; value: string } => Boolean(detail))
    .slice(0, 4)
    .map((detail) => ({
      label: mapReportDetailLabel(detail.label),
      value: detail.value,
    }));
}

function mapReportDetailLabel(label: string): string {
  switch (label) {
    case "Normalized URL":
      return "Destination";
    case "Wallet / payment target":
      return "Wallet";
    case "Issuer / authority":
      return "Issuer";
    default:
      return label;
  }
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 12h.01M12 12h.01M19 12h.01"
        stroke="currentColor"
        strokeWidth="2"
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
