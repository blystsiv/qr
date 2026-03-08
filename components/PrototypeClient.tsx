"use client";

import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraScanner } from "@/components/CameraScanner";
import { ResultPanel } from "@/components/ResultPanel";
import { classifyQR } from "@/lib/classifyQR";
import { samplePayloads } from "@/lib/samples/payloads";
import type { QRInspectionResult } from "@/lib/types/qr";

type InputMode = "camera" | "upload" | "paste";

export function PrototypeClient() {
  const uploadReaderId = useId().replace(/:/g, "_");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [payload, setPayload] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Manual input");
  const [result, setResult] = useState<QRInspectionResult>(() => classifyQR(""));
  const [developerMode, setDeveloperMode] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(
    "Upload a QR image to decode it locally.",
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f7f2_0%,#edf2f7_100%)] px-3 py-6 text-stone-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            QR Inspector Prototype
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
            Scan, upload, or paste QR content to see what it probably contains.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:gap-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                    className="min-h-[220px] w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white sm:min-h-[280px]"
                  />
                  <p className="text-sm text-stone-500">
                    The result updates as the payload changes.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Source
              </p>
              <p className="mt-2 text-sm text-stone-800">{sourceLabel}</p>
            </div>

            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Samples
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Quick test payloads.
                  </p>
                </div>

                <label className="flex items-center gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={developerMode}
                    onChange={(event) => setDeveloperMode(event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                  Debug
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {samplePayloads.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample.id)}
                    className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <ResultPanel
            result={result}
            sourceLabel={sourceLabel}
            developerMode={developerMode}
          />
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
      className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
        active
          ? "bg-stone-900 text-white"
          : "border border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-stone-50"
      }`}
    >
      {label}
    </button>
  );
}
