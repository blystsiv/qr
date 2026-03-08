import type {
  QRInspectionResult,
  RiskLevel,
  VerdictLevel,
} from "@/lib/types/qr";
import type { TLVNode } from "@/lib/types/tlv";

type ResultPanelProps = {
  result: QRInspectionResult;
  sourceLabel: string;
  developerMode: boolean;
};

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
  unknown: "bg-stone-200 text-stone-700",
};

const confidenceStyles = {
  high: "bg-sky-100 text-sky-800",
  medium: "bg-violet-100 text-violet-800",
  low: "bg-stone-200 text-stone-700",
};

const verdictStyles: Record<VerdictLevel, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-900",
  suspicious: "border-amber-200 bg-amber-50 text-amber-900",
  scam: "border-rose-200 bg-rose-50 text-rose-900",
  "needs-verification": "border-sky-200 bg-sky-50 text-sky-900",
  informational: "border-stone-200 bg-stone-50 text-stone-900",
};

export function ResultPanel({
  result,
  sourceLabel,
  developerMode,
}: ResultPanelProps) {
  const nestedTags = Object.entries(result.debug?.nestedTags ?? {});
  const hasPayload = result.rawPayload.trim().length > 0;
  const verdict = result.verdict;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Result
          </p>
          <h2 className="text-2xl font-semibold text-stone-900">
            {result.detectedType}
          </h2>
          <p className="text-sm font-medium text-stone-800">
            What it likely contains
          </p>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            {result.summary}
          </p>
          <p className="text-sm text-stone-500">Source: {sourceLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {verdict ? (
            <Badge
              label={`Verdict: ${verdict.label}`}
              className={
                verdict.level === "safe"
                  ? "bg-emerald-100 text-emerald-800"
                  : verdict.level === "suspicious"
                    ? "bg-amber-100 text-amber-800"
                    : verdict.level === "scam"
                      ? "bg-rose-100 text-rose-800"
                      : verdict.level === "needs-verification"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-stone-200 text-stone-700"
              }
            />
          ) : null}
          {result.scheme ? (
            <Badge label={`Scheme: ${result.scheme}`} tone="neutral" />
          ) : null}
          <Badge
            label={`Confidence: ${result.confidence}`}
            className={confidenceStyles[result.confidence]}
          />
          <Badge
            label={`Risk: ${result.riskLevel}`}
            className={riskStyles[result.riskLevel]}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {verdict ? (
            <section
              className={`rounded-xl border px-4 py-4 ${verdictStyles[verdict.level]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                User verdict
              </p>
              <p className="mt-2 text-lg font-semibold">{verdict.label}</p>
              <p className="mt-2 text-sm leading-6">{verdict.explanation}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              What this means
            </h3>
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-700">
              {result.plainLanguage ?? result.summary}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Details
            </h3>

            {result.details.length ? (
              <div className="mt-3 space-y-2 md:hidden">
                {result.details.map((detail) => (
                  <div
                    key={detail.label}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {detail.label}
                    </p>
                    <p className="mt-2 break-words text-sm text-stone-900">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {result.details.length ? (
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-stone-200 md:block">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <tbody className="divide-y divide-stone-200">
                    {result.details.map((detail) => (
                      <tr key={detail.label} className="align-top">
                        <th className="w-40 bg-stone-50 px-4 py-3 text-left font-medium text-stone-600">
                          {detail.label}
                        </th>
                        <td className="px-4 py-3 break-words text-stone-900">
                          {detail.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                No structured fields were found.
              </p>
            )}
          </section>

          {result.recommendedActions?.length ? (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                What you can do
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                {result.recommendedActions.map((action) => (
                  <li
                    key={action}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Safety notes
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
              {result.safetyNotes.map((note) => (
                <li
                  key={note}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                >
                  {note}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          {hasPayload ? (
            <details className="rounded-xl border border-stone-200 bg-stone-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-900">
                Raw payload
              </summary>
              <pre className="overflow-x-auto border-t border-stone-200 px-4 py-4 text-xs leading-6 text-stone-700">
                {result.rawPayload}
              </pre>
            </details>
          ) : null}

          {developerMode && result.debug && hasPayload ? (
            <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Debug
                </h3>
                <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700">
                  {result.debug.matchedBy}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Detection steps
                  </p>
                  <ol className="mt-2 space-y-2 text-sm text-stone-700">
                    {result.debug.steps.map((step, index) => (
                      <li
                        key={`${index}-${step}`}
                        className="rounded-lg bg-white px-3 py-2"
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>

                {result.debug.crc ? (
                  <section>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      CRC
                    </p>
                    <div className="mt-2 rounded-lg bg-white p-3 text-sm text-stone-700">
                      <p>Present: {result.debug.crc.present ? "Yes" : "No"}</p>
                      <p>
                        Expected: {result.debug.crc.expected ?? "Not provided"}
                      </p>
                      <p>
                        Calculated:{" "}
                        {result.debug.crc.calculated ?? "Not calculated"}
                      </p>
                      <p>
                        Valid:{" "}
                        {typeof result.debug.crc.valid === "boolean"
                          ? result.debug.crc.valid
                            ? "Yes"
                            : "No"
                          : "Unknown"}
                      </p>
                      <p className="mt-2 text-stone-500">
                        {result.debug.crc.message}
                      </p>
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

                {result.debug.heuristics?.length ? (
                  <section>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Heuristics
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-stone-700">
                      {result.debug.heuristics.map((item) => (
                        <li
                          key={item}
                          className="rounded-lg bg-white px-3 py-2"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Badge({
  label,
  className,
  tone = "soft",
}: {
  label: string;
  className?: string;
  tone?: "soft" | "neutral";
}) {
  const baseClass =
    tone === "neutral"
      ? "rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white"
      : "rounded-full px-3 py-1 text-xs font-medium";

  return (
    <span className={className ? `${baseClass} ${className}` : baseClass}>
      {label}
    </span>
  );
}

function TlvTable({ title, nodes }: { title: string; nodes: TLVNode[] }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>
      <div className="mt-2 space-y-2 md:hidden">
        {nodes.map((node) => (
          <div
            key={`${node.tag}-${node.start}`}
            className="rounded-lg border border-stone-200 bg-white px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-stone-700">{node.tag}</span>
              <span className="text-xs text-stone-500">Len {node.length}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-stone-600">
              {node.label ?? "Unlabeled"}
            </p>
            <p className="mt-2 break-all text-xs text-stone-800">
              {truncateValue(node.value)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <table className="min-w-full divide-y divide-stone-200 text-xs">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Tag</th>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Length</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {nodes.map((node) => (
              <tr key={`${node.tag}-${node.start}`}>
                <td className="px-3 py-2 align-top font-mono">{node.tag}</td>
                <td className="px-3 py-2 align-top">
                  {node.label ?? "Unlabeled"}
                </td>
                <td className="px-3 py-2 align-top">{node.length}</td>
                <td className="px-3 py-2 align-top break-all">
                  {truncateValue(node.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function truncateValue(value: string): string {
  if (value.length <= 72) {
    return value;
  }

  return `${value.slice(0, 72)}…`;
}
