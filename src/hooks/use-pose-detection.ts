"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { JointData, Vector3 } from "@/types/motion";

// ─── Pose Detection Result ─────────────────────────────────────────────

export interface PoseResult {
  joints: JointData[];
  timestamp: number;
}

export interface UsePoseDetectionOptions {
  onFrame?: (result: PoseResult) => void;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const { onFrame, minDetectionConfidence = 0.5, minTrackingConfidence = 0.5 } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animFrameRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  // ─── Initialise PoseLandmarker ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { PoseLandmarker, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );

        const wasmFileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm",
        );

        // Try GPU first, fallback to CPU for mobile browsers without WebGL 2.0
        let poseDetector: any;
        try {
          poseDetector = await PoseLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO" as const,
            numPoses: 1,
            minPoseDetectionConfidence: minDetectionConfidence,
            minPosePresenceConfidence: minDetectionConfidence,
            minTrackingConfidence: minTrackingConfidence,
          });
        } catch {
          // GPU failed, retry with CPU (common on mobile)
          console.warn("GPU delegate failed, falling back to CPU");
          poseDetector = await PoseLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO" as const,
            numPoses: 1,
            minPoseDetectionConfidence: minDetectionConfidence,
            minPosePresenceConfidence: minDetectionConfidence,
            minTrackingConfidence: minTrackingConfidence,
          });
        }

        if (!cancelled) {
          detectorRef.current = poseDetector;
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Pose detection init failed:", err);
          setError("姿态检测初始化失败，请检查网络连接");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [minDetectionConfidence, minTrackingConfidence]);

  // ─── Camera ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: "user",
        },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.width = 640;
      video.height = 480;
      video.style.display = "none";
      document.body.appendChild(video);
      await video.play();

      videoRef.current = video;
      streamRef.current = stream;
      return true;
    } catch (err) {
      const e = err as DOMException;
      switch (e.name) {
        case "NotAllowedError":
          setError("请在浏览器设置中允许摄像头权限");
          break;
        case "NotFoundError":
          setError("未检测到摄像头设备");
          break;
        case "NotReadableError":
          setError("摄像头被其他应用占用，请关闭后重试");
          break;
        case "OverconstrainedError":
          setError("当前设备不支持所选摄像头参数");
          break;
        default:
          setError("无法访问摄像头，请检查权限");
      }
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }
  }, []);

  // ─── Detect loop ───────────────────────────────────────────────────
  const detect = useCallback(() => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      const result = detector.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        const joints = landmarksToJoints(landmarks);

        onFrameRef.current?.({ joints, timestamp: Date.now() });
      }
    } catch {
      // Silently skip failed frames
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, []); // empty deps — onFrameRef.current always up-to-date

  const startDetection = useCallback(() => {
    animFrameRef.current = requestAnimationFrame(detect);
  }, [detect]);

  const stopDetection = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isReady,
    error,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    streamRef,
  };
}

// ─── MediaPipe landmark conversion ─────────────────────────────────────

const KEYPOINT_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
];

function landmarksToJoints(
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
): JointData[] {
  const scale = 1.5;
  const joints: JointData[] = [];

  // Direct MediaPipe landmarks
  for (let i = 0; i < Math.min(landmarks.length, KEYPOINT_NAMES.length); i++) {
    const lm = landmarks[i];
    const name = KEYPOINT_NAMES[i];
    const ourId = MEDIAPIPE_MAP[name];
    if (!ourId) continue;

    joints.push({
      id: ourId,
      pos: {
        x: (lm.x - 0.5) * scale,
        y: (0.5 - lm.y) * scale,
        z: lm.z,
      },
      confidence: lm.visibility ?? 1,
    });
  }

  // Synthetic joints
  const leftHip = joints.find((j) => j.id === "left_hip");
  const rightHip = joints.find((j) => j.id === "right_hip");
  const leftShoulder = joints.find((j) => j.id === "left_shoulder");
  const rightShoulder = joints.find((j) => j.id === "right_shoulder");
  const head = joints.find((j) => j.id === "head");

  if (leftHip && rightHip) {
    const hipCenterPos = midpoint(leftHip.pos, rightHip.pos);
    const hipCenterConf = Math.min(leftHip.confidence, rightHip.confidence);
    joints.push({
      id: "hip_center",
      pos: hipCenterPos,
      confidence: hipCenterConf,
    });

    if (leftShoulder && rightShoulder) {
      const chestPos = midpoint(leftShoulder.pos, rightShoulder.pos);
      const chestConf = Math.min(
        leftShoulder.confidence,
        rightShoulder.confidence,
      );

      joints.push({
        id: "chest",
        pos: chestPos,
        confidence: chestConf,
      });

      // spine = hip_center ↔ chest
      joints.push({
        id: "spine",
        pos: midpoint(hipCenterPos, chestPos),
        confidence: (hipCenterConf + chestConf) / 2,
      });

      if (head) {
        joints.push({
          id: "neck",
          pos: midpoint(chestPos, head.pos),
          confidence: (chestConf + head.confidence) / 2,
        });
      }
    }
  }

  return joints;
}

const MEDIAPIPE_MAP: Record<string, string> = {
  nose: "head",
  left_eye_inner: "head",
  left_eye: "head",
  left_eye_outer: "head",
  right_eye_inner: "head",
  right_eye: "head",
  right_eye_outer: "head",
  left_ear: "head",
  right_ear: "head",
  mouth_left: "head",
  mouth_right: "head",
  left_shoulder: "left_shoulder",
  right_shoulder: "right_shoulder",
  left_elbow: "left_elbow",
  right_elbow: "right_elbow",
  left_wrist: "left_wrist",
  right_wrist: "right_wrist",
  left_pinky: "left_hand",
  right_pinky: "right_hand",
  left_index: "left_hand",
  right_index: "right_hand",
  left_thumb: "left_hand",
  right_thumb: "right_hand",
  left_hip: "left_hip",
  right_hip: "right_hip",
  left_knee: "left_knee",
  right_knee: "right_knee",
  left_ankle: "left_ankle",
  right_ankle: "right_ankle",
  left_heel: "left_foot",
  right_heel: "right_foot",
  left_foot_index: "left_foot",
  right_foot_index: "right_foot",
};

function midpoint(a: Vector3, b: Vector3): Vector3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}
