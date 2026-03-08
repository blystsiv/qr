import type { CRCValidationResult, TLVNode } from "@/lib/types/tlv";

export type ConfidenceLevel = "high" | "medium" | "low";
export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type QRInspectionDetail = {
  label: string;
  value: string;
};

export type QRInspectionDebug = {
  matchedBy: string;
  steps: string[];
  topLevelTags?: TLVNode[];
  nestedTags?: Record<string, TLVNode[]>;
  crc?: CRCValidationResult;
  heuristics?: string[];
};

export type QRInspectionResult = {
  detectedType: string;
  scheme?: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  summary: string;
  details: QRInspectionDetail[];
  safetyNotes: string[];
  rawPayload: string;
  debug?: QRInspectionDebug;
};

export type DetectorContext = {
  rawPayload: string;
  normalizedPayload: string;
  pushStep: (step: string) => void;
};

export type QRDetector = {
  id: string;
  detect: (context: DetectorContext) => QRInspectionResult | null;
};

export type SamplePayload = {
  id: string;
  label: string;
  description: string;
  payload: string;
};
