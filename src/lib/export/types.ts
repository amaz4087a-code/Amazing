import type { FeedbackItem, TrainingSuggestion } from "@/lib/assessment/types";

export interface ExportMeta {
  assessmentId: string;
  motionName: string;
  studentName: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  overallScore: number;
  analysisDurationMs: number;
  scoringVersion: string;
}

export interface ExportIndicator {
  id: string;
  label: string;
  score: number;
  weight: number;
}

export interface ExportJointDeviation {
  jointId: string;
  jointLabel: string;
  bodyPart: string;
  deviation: number;
}

export interface ExportData {
  meta: ExportMeta;
  indicators: ExportIndicator[];
  jointDeviations: ExportJointDeviation[];
  feedbackItems: FeedbackItem[];
  trainingSuggestions: TrainingSuggestion[];
}
