import type { QRDetector } from "@/lib/types/qr";
import { detectAction } from "@/lib/detectors/actionDetector";
import { detectCalendarEvent } from "@/lib/detectors/calendarDetector";
import { detectContact } from "@/lib/detectors/contactDetector";
import { detectCrypto } from "@/lib/detectors/cryptoDetector";
import { detectDocumentLikePayload } from "@/lib/detectors/documentDetector";
import { detectGovernmentLikePayload } from "@/lib/detectors/governmentDetector";
import { detectLocation } from "@/lib/detectors/locationDetector";
import { detectPayment } from "@/lib/detectors/paymentDetector";
import { detectTextOrUnknown } from "@/lib/detectors/textDetector";
import { detectUrl } from "@/lib/detectors/urlDetector";
import { detectWifi } from "@/lib/detectors/wifiDetector";

export const qrDetectors: QRDetector[] = [
  { id: "wifiDetector", detect: detectWifi },
  { id: "contactDetector", detect: detectContact },
  { id: "calendarDetector", detect: detectCalendarEvent },
  { id: "actionDetector", detect: detectAction },
  { id: "locationDetector", detect: detectLocation },
  { id: "cryptoDetector", detect: detectCrypto },
  { id: "paymentDetector", detect: detectPayment },
  { id: "urlDetector", detect: detectUrl },
  { id: "documentDetector", detect: detectDocumentLikePayload },
  { id: "governmentDetector", detect: detectGovernmentLikePayload },
  { id: "textDetector", detect: detectTextOrUnknown },
];
