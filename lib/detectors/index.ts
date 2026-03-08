import type { QRDetector } from "@/lib/types/qr";
import { detectAction } from "@/lib/detectors/actionDetector";
import { detectCalendarEvent } from "@/lib/detectors/calendarDetector";
import { detectContact } from "@/lib/detectors/contactDetector";
import { detectCrypto } from "@/lib/detectors/cryptoDetector";
import { detectGovernmentLikePayload } from "@/lib/detectors/governmentDetector";
import { detectPayment } from "@/lib/detectors/paymentDetector";
import { detectTextOrUnknown } from "@/lib/detectors/textDetector";
import { detectUrl } from "@/lib/detectors/urlDetector";
import { detectWifi } from "@/lib/detectors/wifiDetector";

export const qrDetectors: QRDetector[] = [
  { id: "wifiDetector", detect: detectWifi },
  { id: "contactDetector", detect: detectContact },
  { id: "calendarDetector", detect: detectCalendarEvent },
  { id: "actionDetector", detect: detectAction },
  { id: "cryptoDetector", detect: detectCrypto },
  { id: "paymentDetector", detect: detectPayment },
  { id: "urlDetector", detect: detectUrl },
  { id: "governmentDetector", detect: detectGovernmentLikePayload },
  { id: "textDetector", detect: detectTextOrUnknown },
];
