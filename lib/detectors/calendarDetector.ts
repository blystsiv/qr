import type { DetectorContext, QRInspectionDetail, QRInspectionResult } from "@/lib/types/qr";

export function detectCalendarEvent(
  context: DetectorContext,
): QRInspectionResult | null {
  if (!/BEGIN:VEVENT/i.test(context.normalizedPayload)) {
    return null;
  }

  context.pushStep("Matched BEGIN:VEVENT marker.");
  const fields = parseCalendarFields(context.normalizedPayload);
  const details: QRInspectionDetail[] = [];

  if (fields.summary) {
    details.push({ label: "Summary", value: fields.summary });
  }

  if (fields.start) {
    details.push({ label: "Starts", value: fields.start });
  }

  if (fields.end) {
    details.push({ label: "Ends", value: fields.end });
  }

  if (fields.location) {
    details.push({ label: "Location", value: fields.location });
  }

  return {
    detectedType: "Calendar event",
    scheme: "VEVENT",
    confidence: "high",
    riskLevel: "low",
    summary: `This QR contains a calendar event${
      fields.summary ? ` titled "${fields.summary}"` : ""
    }.`,
    details,
    safetyNotes: [
      "This QR contains event details, not a website link.",
      "Review the date, time, and location before adding the event to your calendar.",
    ],
    rawPayload: context.rawPayload,
    debug: {
      matchedBy: "calendarDetector",
      steps: [],
    },
  };
}

function parseCalendarFields(payload: string): {
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
} {
  const lines = payload.replace(/\r\n/g, "\n").split("\n");
  const fields = new Map<string, string>();

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).split(";")[0].toUpperCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }

    fields.set(key, value);
  }

  return {
    summary: fields.get("SUMMARY"),
    start: formatCalendarDate(fields.get("DTSTART")),
    end: formatCalendarDate(fields.get("DTEND")),
    location: fields.get("LOCATION"),
  };
}

function formatCalendarDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(
      6,
      8,
    )} ${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(
      13,
      15,
    )} UTC`;
  }

  return value;
}
