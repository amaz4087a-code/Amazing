import { create } from "zustand";
import type { JointData } from "@/types/motion";

export interface CapturedFrame {
  timestamp: number;
  joints: JointData[];
}

interface AssessmentState {
  // Session
  sessionId: string | null;

  // Recording
  isRecording: boolean;
  capturedFrames: CapturedFrame[];
  frameCount: number;

  // Live scoring (updated in real-time)
  currentAccuracy: number;
  currentFluidity: number;

  // Actions
  setSessionId: (id: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addFrame: (joints: JointData[]) => void;
  clearFrames: () => void;
  setCurrentAccuracy: (v: number) => void;
  setCurrentFluidity: (v: number) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  isRecording: false,
  capturedFrames: [] as CapturedFrame[],
  frameCount: 0,
  currentAccuracy: 0,
  currentFluidity: 0,
};

export const useAssessmentStore = create<AssessmentState>()((set, get) => ({
  ...initialState,

  setSessionId: (id: string) => set({ sessionId: id }),

  startRecording: () =>
    set({ isRecording: true, capturedFrames: [], frameCount: 0 }),

  stopRecording: () => set({ isRecording: false }),

  addFrame: (joints: JointData[]) =>
    set((state) => {
      if (!state.isRecording) return state;
      const frame: CapturedFrame = {
        timestamp: Date.now(),
        joints,
      };
      return {
        capturedFrames: [...state.capturedFrames, frame],
        frameCount: state.frameCount + 1,
      };
    }),

  clearFrames: () => set({ capturedFrames: [], frameCount: 0 }),

  setCurrentAccuracy: (v: number) => set({ currentAccuracy: v }),
  setCurrentFluidity: (v: number) => set({ currentFluidity: v }),

  reset: () => set(initialState),
}));
