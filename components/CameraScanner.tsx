"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type CameraScannerProps = {
  active: boolean;
  onDetected: (payload: string) => void;
};

export function CameraScanner({ active, onDetected }: CameraScannerProps) {
  const elementId = useId().replace(/:/g, "_");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState("Hold the QR code inside the frame.");
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
      // Ignore shutdown errors so the next scan can start cleanly.
    }

    try {
      scanner.clear();
    } catch {
      // Ignore DOM cleanup errors from stale scanner instances.
    }
  });

  const handleDetected = useEffectEvent((payload: string) => {
    setStatus("QR code captured.");
    setError(null);
    onDetected(payload);
  });

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      void stopScanner();
      setStatus("Hold the QR code inside the frame.");
      setError(null);
      return;
    }

    async function startScanner() {
      setStatus("Opening camera...");
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
          setError("No camera was found on this device.");
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
            {
              fps: 10,
              aspectRatio: 1,
            },
            handleDetected,
            () => undefined,
          );
        } catch {
          await scanner.start(
            cameras[0].id,
            {
              fps: 10,
              aspectRatio: 1,
            },
            handleDetected,
            () => undefined,
          );
        }

        if (!cancelled) {
          setStatus("Align the QR code inside the frame.");
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
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[343px] overflow-hidden rounded-[32px] border border-[#22465b] bg-[radial-gradient(circle_at_top,#24495d_0%,#173546_42%,#08131d_100%)] p-4">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(155,203,234,0.18)_0%,transparent_65%)]" />
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[274px]">
          <div className="scanner-viewport absolute inset-0 overflow-hidden rounded-[24px] bg-black/20">
            <div id={elementId} className="h-full w-full [&>div]:h-full [&>div]:w-full" />
          </div>

          <div className="pointer-events-none absolute inset-[14px] rounded-[18px] border border-[#9bcbea66]" />
          <ScanCorners />
        </div>
      </div>

      <p className="mt-6 text-center text-xl font-semibold leading-6 text-white">
        Scan the QR code
      </p>
      <p className="mt-2 text-center text-sm leading-6 text-white/60">{status}</p>

      {error ? (
        <div className="mt-4 w-full max-w-[343px] rounded-[14px] border border-[#fb504733] bg-[#fb50471a] px-4 py-3 text-sm text-white/85">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function ScanCorners() {
  return (
    <>
      <Corner className="left-0 top-0" />
      <Corner className="right-0 top-0 rotate-90" />
      <Corner className="bottom-0 left-0 -rotate-90" />
      <Corner className="bottom-0 right-0 rotate-180" />
    </>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none absolute h-14 w-14 ${className}`}>
      <div className="absolute left-0 top-0 h-1.5 w-9 rounded-full bg-[#9bcbea]" />
      <div className="absolute left-0 top-0 h-9 w-1.5 rounded-full bg-[#9bcbea]" />
    </div>
  );
}
