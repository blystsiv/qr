import type { QRInspectionResult, RiskLevel } from "@/lib/types/qr";
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

export function ResultPanel({
  result,
  sourceLabel,
  developerMode,
}: ResultPanelProps) {
  const nestedTags = Object.entries(result.debug?.nestedTags ?? {});

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Result
          </p>
          <h2 className="text-2xl font-semibold text-stone-900">
            {result.detectedType}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            {result.summary}
          </p>
          <p className="text-sm text-stone-500">Source: {sourceLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
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
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Parsed details
            </h3>

            {result.details.length ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
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
                No structured fields were extracted for this payload.
              </p>
            )}
          </section>

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
          <details className="rounded-xl border border-stone-200 bg-stone-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-900">
              Raw payload
            </summary>
            <pre className="overflow-x-auto border-t border-stone-200 px-4 py-4 text-xs leading-6 text-stone-700">
              {result.rawPayload}
            </pre>
          </details>

          {developerMode && result.debug ? (
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

                <details className="rounded-lg border border-stone-200 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
                    Full debug JSON
                  </summary>
                  <pre className="overflow-x-auto border-t border-stone-200 px-3 py-3 text-xs leading-6 text-stone-700">
                    {JSON.stringify(result.debug, null, 2)}
                  </pre>
                </details>
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

  return <span className={className ? `${baseClass} ${className}` : baseClass}>{label}</span>;
}

function TlvTable({ title, nodes }: { title: string; nodes: TLVNode[] }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>
      <div className="mt-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
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
                <td className="px-3 py-2 align-top">{node.label ?? "Unlabeled"}</td>
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
