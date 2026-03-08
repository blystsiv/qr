"use client";

import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraScanner } from "@/components/CameraScanner";
import { ResultPanel } from "@/components/ResultPanel";
import { classifyQR } from "@/lib/classifyQR";
import { publicSettings, serverIntegrationEnvNames } from "@/lib/config";
import { samplePayloads } from "@/lib/samples/payloads";
import type { QRInspectionResult } from "@/lib/types/qr";

type InputMode = "camera" | "upload" | "paste";

const defaultSample = samplePayloads[0];

export function PrototypeClient() {
  const uploadReaderId = useId().replace(/:/g, "_");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [payload, setPayload] = useState(defaultSample.payload);
  const [sourceLabel, setSourceLabel] = useState(
    `Sample: ${defaultSample.label}`,
  );
  const [result, setResult] = useState<QRInspectionResult>(() =>
    classifyQR(defaultSample.payload),
  );
  const [developerMode, setDeveloperMode] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(
    "Upload an image file with a QR code to decode it locally.",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setResult(classifyQR(payload));
  }, [payload]);

  function applyPayload(nextPayload: string, source: string) {
    setPayload(nextPayload);
    setSourceLabel(source);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setInputMode("upload");
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
      setUploadStatus(`Decoded ${file.name} locally in the browser.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The selected image could not be decoded.";

      setUploadError(message);
      setUploadStatus("No QR payload was decoded from the selected image.");
    } finally {
      try {
        reader?.clear();
      } catch {
        // Ignore cleanup issues when the reader never rendered anything.
      }

      event.target.value = "";
    }
  }

  function loadSample(sampleId: string) {
    const sample = samplePayloads.find((entry) => entry.id === sampleId);
    if (!sample) {
      return;
    }

    setInputMode("paste");
    applyPayload(sample.payload, `Sample: ${sample.label}`);
  }

  function clearPayload() {
    setInputMode("paste");
    applyPayload("", "Manual input");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7f2_0%,#edf2f7_100%)] px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Prototype
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            QR Inspector Prototype
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
            Scan or paste QR content to classify and inspect it. This prototype
            focuses on readable rule-based detection, not production polish.
          </p>
        </header>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <ModeButton
                active={inputMode === "camera"}
                onClick={() => setInputMode("camera")}
                label="Camera scan"
              />
              <ModeButton
                active={inputMode === "upload"}
                onClick={() => setInputMode("upload")}
                label="Upload image"
              />
              <ModeButton
                active={inputMode === "paste"}
                onClick={() => setInputMode("paste")}
                label="Paste raw content"
              />
              <button
                type="button"
                onClick={() => loadSample(defaultSample.id)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                Load demo sample
              </button>
              <button
                type="button"
                onClick={clearPayload}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                Clear
              </button>
            </div>

            <div className="mt-6">
              {inputMode === "camera" ? (
                <CameraScanner
                  active={inputMode === "camera"}
                  onDetected={(decodedPayload) =>
                    applyPayload(decodedPayload, "Live camera scan")
                  }
                />
              ) : null}

              {inputMode === "upload" ? (
                <div className="space-y-4">
                  <label className="block rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                    <span className="mb-3 block font-medium text-stone-900">
                      Select a QR image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                  </label>

                  <p className="text-sm text-stone-600">{uploadStatus}</p>

                  {uploadError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {uploadError}
                    </p>
                  ) : null}

                  <div id={uploadReaderId} className="h-0 overflow-hidden" />
                </div>
              ) : null}

              {inputMode === "paste" ? (
                <div className="space-y-3">
                  <label
                    htmlFor="manual-payload"
                    className="block text-sm font-medium text-stone-900"
                  >
                    Raw decoded QR content
                  </label>
                  <textarea
                    id="manual-payload"
                    value={payload}
                    onChange={(event) => {
                      setInputMode("paste");
                      applyPayload(event.target.value, "Manual paste");
                    }}
                    placeholder="Paste decoded QR content here..."
                    className="min-h-[280px] w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                  />
                  <p className="text-sm text-stone-500">
                    Classification updates immediately as the payload changes.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Current payload source
              </p>
              <p className="mt-2 text-sm text-stone-800">{sourceLabel}</p>
            </div>
          </section>

          <ResultPanel
            result={result}
            sourceLabel={sourceLabel}
            developerMode={developerMode}
          />
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Sample data
                </p>
                <h2 className="mt-2 text-xl font-semibold text-stone-900">
                  Test payloads
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Load common QR payloads to test detector behavior without
                  needing a live camera or image upload.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {samplePayloads.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample.id)}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-left transition hover:border-stone-300 hover:bg-white"
                >
                  <p className="font-medium text-stone-900">{sample.label}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {sample.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Settings
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              Optional integrations
            </h2>

            <div className="mt-5 space-y-3 text-sm text-stone-700">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">
                  URL reputation checks
                </p>
                <p className="mt-1">
                  {publicSettings.enableUrlReputation ? "Enabled" : "Disabled"}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">API base URL</p>
                <p className="mt-1 break-all">
                  {publicSettings.apiBaseUrl || "Not configured"}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="font-medium text-stone-900">
                  Server-side secret placeholders
                </p>
                <p className="mt-1">
                  {serverIntegrationEnvNames.join(", ")}
                </p>
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={(event) => setDeveloperMode(event.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
              />
              Show developer debug panel
            </label>

            <p className="mt-4 text-sm leading-6 text-stone-600">
              The prototype runs fully offline for detection. If you later add
              reputation lookups or payment intelligence, keep API keys in{" "}
              <code>.env.local</code> and expose only safe public flags through{" "}
              <code>NEXT_PUBLIC_*</code> variables.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-stone-900 text-white"
          : "border border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-stone-50"
      }`}
    >
      {label}
    </button>
  );
}
