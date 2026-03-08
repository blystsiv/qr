"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type CameraScannerProps = {
  active: boolean;
  onDetected: (payload: string) => void;
};

export function CameraScanner({
  active,
  onDetected,
}: CameraScannerProps) {
  const elementId = useId().replace(/:/g, "_");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState("Camera scanner is idle.");
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useEffectEvent(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore shutdown errors so the UI can recover on the next start.
    }

    try {
      scanner.clear();
    } catch {
      // Ignore stale DOM cleanup errors when nothing was rendered.
    }
  });

  const handleDetected = useEffectEvent((payload: string) => {
    setStatus("QR code captured from the live camera feed.");
    setError(null);
    onDetected(payload);
  });

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      void stopScanner();
      setStatus("Camera scanner is idle.");
      setError(null);
      return;
    }

    async function startScanner() {
      setStatus("Requesting camera access...");
      setError(null);

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );

        if (cancelled) {
          return;
        }

        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) {
          return;
        }

        if (!cameras.length) {
          setStatus("Camera unavailable.");
          setError("No camera was detected in this browser.");
          return;
        }

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        scannerRef.current = scanner;

        try {
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            handleDetected,
            () => undefined,
          );
        } catch {
          await scanner.start(
            cameras[0].id,
            { fps: 10, qrbox: { width: 240, height: 240 } },
            handleDetected,
            () => undefined,
          );
        }

        if (!cancelled) {
          setStatus("Point the camera at a QR code.");
        }
      } catch (scannerError) {
        if (cancelled) {
          return;
        }

        const message =
          scannerError instanceof Error
            ? scannerError.message
            : "Camera access failed.";

        setStatus("Camera unavailable.");
        setError(message);
        await stopScanner();
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [active, elementId]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        <div id={elementId} className="min-h-[260px] sm:min-h-[320px]" />
      </div>

      <p className="text-sm text-stone-600">{status}</p>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-stone-500">
        Camera scanning works best on <code>localhost</code> or another secure
        origin because browsers require permission before exposing the camera.
      </p>
    </div>
  );
}
