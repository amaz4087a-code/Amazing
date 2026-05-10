import type { JointData, MotionFrameData, MotionSequence } from "@/types/motion";

export function parseMotionFile(
  buffer: Buffer,
  filename: string
): MotionSequence {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "json":
      return parseJSONMotion(buffer, filename);
    case "csv":
      return parseCSVMotion(buffer);
    default:
      throw new Error(`Unsupported format: .${ext}. Supported: .json, .csv`);
  }
}

function parseJSONMotion(buffer: Buffer, filename: string): MotionSequence {
  const raw = JSON.parse(buffer.toString("utf-8"));

  // Support both direct MotionSequence and { motion: ... } wrapper
  const data = raw.motion ?? raw;

  const frames: MotionFrameData[] = (data.frames ?? []).map(
    (f: any, i: number) => ({
      frameIndex: f.frameIndex ?? i,
      timestamp: f.timestamp ?? f.frameIndex / (data.fps || 30),
      joints: (f.joints ?? []).map((j: any) => ({
        id: j.id,
        pos: { x: j.pos?.x ?? 0, y: j.pos?.y ?? 0, z: j.pos?.z ?? 0 },
        rot: j.rot ? { x: j.rot.x, y: j.rot.y, z: j.rot.z, w: j.rot.w } : undefined,
        confidence: j.confidence ?? 1.0,
      })),
    })
  );

  return {
    id: data.id ?? "",
    name: data.name ?? filename,
    fps: data.fps ?? 30,
    frameCount: frames.length,
    jointNames: data.jointNames ?? extractJointNames(frames),
    duration: data.duration ?? (frames.length > 0 ? frames[frames.length - 1].timestamp : 0),
    frames,
  };
}

function parseCSVMotion(buffer: Buffer): MotionSequence {
  const text = buffer.toString("utf-8").trim();
  const lines = text.split("\n");
  if (lines.length < 2) throw new Error("CSV must have header + at least 1 data row");

  const headers = lines[0].split(",").map((h) => h.trim());
  // Expected format: frame_index, timestamp, joint_id, pos_x, pos_y, pos_z, confidence
  // Or wide format: frame_index, timestamp, head_x, head_y, head_z, head_conf, neck_x, ...

  // Detect format: if "joint_id" column exists, it's long format
  const isLongFormat = headers.includes("joint_id");

  if (isLongFormat) {
    return parseLongCSV(lines, headers);
  }
  return parseWideCSV(lines, headers);
}

function parseLongCSV(lines: string[], headers: string[]): MotionSequence {
  const frameMap = new Map<number, JointData[]>();
  let fps = 30;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));

    const frameIndex = parseInt(row.frame_index) || 0;
    const joint: JointData = {
      id: row.joint_id,
      pos: {
        x: parseFloat(row.pos_x ?? "0"),
        y: parseFloat(row.pos_y ?? "0"),
        z: parseFloat(row.pos_z ?? "0"),
      },
      confidence: parseFloat(row.confidence ?? "1.0"),
    };

    if (!frameMap.has(frameIndex)) {
      frameMap.set(frameIndex, []);
    }
    frameMap.get(frameIndex)!.push(joint);
  }

  const sortedFrames = [...frameMap.entries()].sort(([a], [b]) => a - b);
  const frames: MotionFrameData[] = sortedFrames.map(([frameIndex, joints]) => ({
    frameIndex,
    timestamp: frameIndex / fps,
    joints,
  }));

  return {
    id: "",
    name: "imported_motion",
    fps,
    frameCount: frames.length,
    jointNames: extractJointNames(frames),
    duration: frames.length / fps,
    frames,
  };
}

function parseWideCSV(lines: string[], headers: string[]): MotionSequence {
  const fps = 30;
  const frames: MotionFrameData[] = [];
  // Detect joint columns: look for _x, _y, _z suffixes
  const jointColumns = new Map<string, { x: number; y: number; z: number; conf: number }>();

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h.endsWith("_x")) {
      const jointName = h.replace(/_x$/, "");
      const xIdx = i;
      const yIdx = headers.indexOf(`${jointName}_y`);
      const zIdx = headers.indexOf(`${jointName}_z`);
      const confIdx = headers.indexOf(`${jointName}_confidence`);
      if (yIdx !== -1 && zIdx !== -1) {
        jointColumns.set(jointName, { x: xIdx, y: yIdx, z: zIdx, conf: confIdx });
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const frameIndex = i - 1;
    const joints: JointData[] = [];

    for (const [jointName, cols] of jointColumns) {
      joints.push({
        id: jointName,
        pos: {
          x: parseFloat(values[cols.x] ?? "0"),
          y: parseFloat(values[cols.y] ?? "0"),
          z: parseFloat(values[cols.z] ?? "0"),
        },
        confidence: cols.conf !== -1 ? parseFloat(values[cols.conf] ?? "1.0") : 1.0,
      });
    }

    frames.push({
      frameIndex,
      timestamp: frameIndex / fps,
      joints,
    });
  }

  return {
    id: "",
    name: "imported_motion",
    fps,
    frameCount: frames.length,
    jointNames: extractJointNames(frames),
    duration: frames.length / fps,
    frames,
  };
}

function extractJointNames(frames: MotionFrameData[]): string[] {
  if (frames.length === 0) return [];
  return frames[0].joints.map((j) => j.id);
}
