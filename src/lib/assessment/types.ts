import type { JointData } from "@/types/motion";

export interface AlignmentResult {
  path: [number, number][];
  distance: number;
  pairs: { standardFrame: { joints: JointData[] }; userFrame: { joints: JointData[] } }[];
}

export interface IndicatorResult {
  score: number;
  details: Record<string, unknown>;
}

export interface IndicatorScorer {
  id: string;
  name: string;
  description: string;
  score(
    standardFrames: { joints: JointData[] }[],
    userFrames: { joints: JointData[] }[],
    alignment: AlignmentResult,
    selectedJointIds: Set<string>
  ): IndicatorResult;
}

export interface FeedbackItem {
  bodyPart: string;
  jointId: string;
  issue: string;
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface TrainingSuggestion {
  area: string;
  priority: "low" | "medium" | "high";
  suggestion: string;
  exercises: { name: string; description: string }[];
}

export interface AllScores {
  accuracy: number;
  rhythm: number;
  fluidity: number;
  explosiveness: number;
  extension: number;
  symmetry: number;
  stability: number;
  coordination: number;
  syncRate: number;
  rangeOfMotion: number;
  completeness: number;
}
