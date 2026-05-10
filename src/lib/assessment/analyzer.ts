import type { JointData } from "@/types/motion";
import type {
  AlignmentResult,
  IndicatorResult,
  AllScores,
  FeedbackItem,
  TrainingSuggestion,
} from "./types";
import { computeAlignment } from "./rhythm";
import {
  scoreAccuracy,
  scoreRhythm,
  scoreFluidity,
  scoreExplosiveness,
  scoreExtension,
  scoreSymmetry,
  scoreStability,
  scoreCoordination,
  scoreSyncRate,
  scoreRangeOfMotion,
  scoreCompleteness,
} from "./scorers";
import {
  normalizeJoints,
  calcThighLength,
  euclideanDistance,
} from "@/lib/motion/normalizer";
import { JOINTS, BODY_PARTS, type BodyPartId } from "@/config/joints";
import { DEFAULT_SCORING_RATIOS } from "@/config/indicators";

// ─── Options & Result ──────────────────────────────────────────────────

export interface AnalyzeOptions {
  selectedJointIds: Set<string>;
  scoringRatios: Record<string, number>;
  rhythmEnabled: boolean;
}

export interface AnalyzeResult {
  overallScore: number;
  indicatorScores: AllScores;
  jointDeviations: Record<string, number>;
  feedbackItems: FeedbackItem[];
  trainingSuggestions: TrainingSuggestion[];
  analysisDurationMs: number;
}

// ─── Main Entry ─────────────────────────────────────────────────────────

export function analyzeAssessment(
  standardFrames: { joints: JointData[] }[],
  userFrames: { joints: JointData[] }[],
  options: AnalyzeOptions,
): AnalyzeResult {
  const startTime = performance.now();
  const { selectedJointIds, scoringRatios, rhythmEnabled } = options;

  if (standardFrames.length === 0 || userFrames.length === 0) {
    throw new Error("Empty frame data — cannot analyze");
  }

  // 1. Compute standard thigh length for spatial normalisation
  const standardThighLength = calcThighLength(standardFrames[0].joints);

  // 2. DTW alignment on original frames (needs raw hip velocities)
  console.log(`Analyzing: ${standardFrames.length} standard frames, ${userFrames.length} user frames`);
  const alignment = computeAlignment(standardFrames, userFrames);
  console.log(`Alignment path: ${alignment.pairs.length} pairs`);

  // 3. Create spatially-normalised pairs for position-based scorers
  const normalizedPairs = alignment.pairs.map(({ standardFrame, userFrame }, idx) => {
    if (!standardFrame) throw new Error(`standardFrame is undefined at pair ${idx}`);
    if (!userFrame) throw new Error(`userFrame is undefined at pair ${idx}`);
    return {
      standardFrame: {
        joints: normalizeJoints(standardFrame.joints, standardThighLength),
      },
      userFrame: {
        joints: normalizeJoints(userFrame.joints, standardThighLength),
      },
    };
  });

  // 4. Run all 11 scorers
  const accuracyResult = scoreAccuracy(normalizedPairs, selectedJointIds);
  const rhythmResult = rhythmEnabled
    ? scoreRhythm(alignment, standardFrames, userFrames)
    : { score: 50, details: { disabled: true } as Record<string, unknown> };
  const fluidityResult = scoreFluidity(normalizedPairs, selectedJointIds);
  const explosivenessResult = scoreExplosiveness(normalizedPairs, selectedJointIds);
  const extensionResult = scoreExtension(normalizedPairs, selectedJointIds);
  const symmetryResult = scoreSymmetry(normalizedPairs, selectedJointIds);
  const stabilityResult = scoreStability(normalizedPairs, selectedJointIds);
  const coordinationResult = scoreCoordination(normalizedPairs, selectedJointIds);
  const syncRateResult = scoreSyncRate(normalizedPairs, selectedJointIds);
  const rangeOfMotionResult = scoreRangeOfMotion(normalizedPairs, selectedJointIds);
  const completenessResult = scoreCompleteness(normalizedPairs, selectedJointIds);

  const indicatorScores: AllScores = {
    accuracy: accuracyResult.score,
    rhythm: rhythmResult.score,
    fluidity: fluidityResult.score,
    explosiveness: explosivenessResult.score,
    extension: extensionResult.score,
    symmetry: symmetryResult.score,
    stability: stabilityResult.score,
    coordination: coordinationResult.score,
    syncRate: syncRateResult.score,
    rangeOfMotion: rangeOfMotionResult.score,
    completeness: completenessResult.score,
  };

  // 5. Weighted overall score
  const ratios = { ...DEFAULT_SCORING_RATIOS, ...scoringRatios };
  let overallScore = 0;
  let totalRatio = 0;
  for (const [indicatorId, score] of Object.entries(indicatorScores)) {
    const ratio = ratios[indicatorId] ?? 0.05;
    overallScore += score * ratio;
    totalRatio += ratio;
  }
  overallScore =
    totalRatio > 0
      ? Math.round((overallScore / totalRatio) * 10) / 10
      : 0;

  // 6. Per-joint average deviations across all aligned pairs
  const accum: Record<string, { total: number; count: number }> = {};
  for (const { standardFrame, userFrame } of normalizedPairs) {
    for (const joint of standardFrame.joints) {
      if (!selectedJointIds.has(joint.id)) continue;
      const uj = userFrame.joints.find((j) => j.id === joint.id);
      if (!uj || uj.confidence < 0.3) continue;
      const dev = euclideanDistance(joint.pos, uj.pos);
      if (!accum[joint.id]) accum[joint.id] = { total: 0, count: 0 };
      accum[joint.id].total += dev;
      accum[joint.id].count++;
    }
  }
  const jointDeviations: Record<string, number> = {};
  for (const [jointId, { total, count }] of Object.entries(accum)) {
    jointDeviations[jointId] = count > 0 ? total / count : 0;
  }

  // 7. Feedback items
  const feedbackItems = generateFeedback(jointDeviations, selectedJointIds);

  // 8. Training suggestions
  const trainingSuggestions = generateTrainingSuggestions(
    indicatorScores,
    ratios,
  );

  const analysisDurationMs = Math.round(performance.now() - startTime);

  return {
    overallScore: clamp(overallScore, 0, 100),
    indicatorScores,
    jointDeviations,
    feedbackItems,
    trainingSuggestions,
    analysisDurationMs,
  };
}

// ─── Feedback Generation ────────────────────────────────────────────────

const DEVIATION_WARN = 0.05; //  5 cm — mild
const DEVIATION_BAD = 0.10; // 10 cm — serious

function generateFeedback(
  jointDeviations: Record<string, number>,
  selectedJointIds: Set<string>,
): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];

  // Group selected joints by body part
  const groupMap: Record<string, { joints: string[]; totalDev: number }> = {};
  for (const jointId of selectedJointIds) {
    const def = JOINTS[jointId];
    if (!def) continue;
    if (!groupMap[def.group]) {
      groupMap[def.group] = { joints: [], totalDev: 0 };
    }
    groupMap[def.group].joints.push(jointId);
    groupMap[def.group].totalDev += jointDeviations[jointId] ?? 0;
  }

  for (const [groupId, data] of Object.entries(groupMap)) {
    const avgDev = data.totalDev / data.joints.length;
    if (avgDev < DEVIATION_WARN) continue;

    // Find the worst joint in this group for a specific pointer
    const worst = data.joints
      .map((id) => ({ id, dev: jointDeviations[id] ?? 0 }))
      .sort((a, b) => b.dev - a.dev)[0];

    const bodyPartName = BODY_PARTS[groupId as BodyPartId]?.name ?? groupId;
    const severity =
      avgDev > DEVIATION_BAD ? "high" : avgDev > DEVIATION_WARN * 1.5 ? "medium" : "low";
    const devCm = (avgDev * 100).toFixed(1);

    feedback.push({
      bodyPart: bodyPartName,
      jointId: worst.id,
      issue: `平均偏差 ${devCm} cm`,
      severity,
      description: `${bodyPartName}的平均位置偏差为 ${devCm} cm，与标准动作存在差异。`,
      suggestion: severity === "high"
        ? `重点关注 ${JOINTS[worst.id]?.label ?? worst.id} 的位置控制，建议放慢动作速度并借助镜子 / 录像纠正轨迹。`
        : `注意 ${bodyPartName} 的动作轨迹，适当放慢节奏提升准确度。`,
    });
  }

  return feedback;
}

// ─── Training Suggestions ───────────────────────────────────────────────

function generateTrainingSuggestions(
  scores: AllScores,
  ratios: Record<string, number>,
): TrainingSuggestion[] {
  const suggestions: TrainingSuggestion[] = [];

  const indicatorMeta: Record<string, { name: string }> = {
    accuracy: { name: "准确性" },
    rhythm: { name: "节奏感" },
    fluidity: { name: "流畅度" },
    explosiveness: { name: "爆发力" },
    extension: { name: "伸展度" },
    symmetry: { name: "对称性" },
    stability: { name: "稳定性" },
    coordination: { name: "协调性" },
    syncRate: { name: "节奏同步率" },
    rangeOfMotion: { name: "动作幅度" },
    completeness: { name: "完成度" },
  };

  const lowScorers = (Object.entries(scores) as [keyof AllScores, number][])
    .filter(([_, s]) => s < 65)
    .sort(([_, a], [__, b]) => a - b);

  for (const [indicatorId, score] of lowScorers) {
    const meta = indicatorMeta[indicatorId];
    if (!meta) continue;

    const priority: "low" | "medium" | "high" =
      score < 40 ? "high" : score < 55 ? "medium" : "low";
    const weight = ratios[indicatorId] ?? 0.05;

    suggestions.push({
      area: meta.name,
      priority,
      suggestion: `${meta.name} (${score} 分, 权重 ${(weight * 100).toFixed(0)}%) 需要加强训练。`,
      exercises: indicatorExercises(indicatorId),
    });
  }

  return suggestions;
}

function indicatorExercises(
  indicatorId: string,
): { name: string; description: string }[] {
  const exercises: Record<string, { name: string; description: string }[]> = {
    accuracy: [
      { name: "镜像练习", description: "面对镜子缓慢执行动作，逐帧核对关节位置" },
      { name: "分段练习", description: "将动作分解为 3–5 段逐一打磨后串联" },
    ],
    rhythm: [
      { name: "节拍器跟练", description: "跟随节拍器做基础步伐，逐步加速" },
      { name: "重拍对齐", description: "听音乐重音做关键姿态定格" },
    ],
    fluidity: [
      { name: "慢速过动作", description: "以 50% 速度完整过动作，消除停顿点" },
      { name: "呼吸引导", description: "配合呼吸节奏做动作衔接" },
    ],
    explosiveness: [
      { name: "速度峰值训练", description: "标记动作中需要爆发的位置做快速发力练习" },
      { name: "弹力带抗阻", description: "在关键发力点增加弹力带阻力" },
    ],
    extension: [
      { name: "主动拉伸", description: "针对受限关节做主动性拉伸（每日 15 min）" },
      { name: "末端停顿", description: "动作至最大幅度时保持 2 秒再回收" },
    ],
    symmetry: [
      { name: "单侧强化", description: "对较弱侧单独做相同次数练习" },
      { name: "双侧镜像", description: "面对镜子做对称动作，目视检查" },
    ],
    stability: [
      { name: "核心激活", description: "练习平板支撑、鸟狗式增强核心控制" },
      { name: "慢速单腿", description: "单腿站立做上肢动作训练平衡" },
    ],
    coordination: [
      { name: "手足配合", description: "做手脚分离的协调练习，如交叉触膝" },
      { name: "渐进复合", description: "先练上肢再练下肢然后组合" },
    ],
    syncRate: [
      { name: "节奏模仿", description: "跟随标准视频做同一节奏重复练习" },
      { name: "变速训练", description: "用 0.75× / 1.0× / 1.25× 速度分别练习" },
    ],
    rangeOfMotion: [
      { name: "幅度标记", description: "在地面/墙面做标记，确保每次到位" },
      { name: "动态拉伸", description: "练习动态拉伸增加关节活动范围" },
    ],
    completeness: [
      { name: "完整串联", description: "从头到尾不间断完成整套动作" },
      { name: "耐力训练", description: "增加单次练习组数提升完成能力" },
    ],
  };

  return exercises[indicatorId] ?? [
    { name: "基础重复", description: "反复练习直至动作自然流畅" },
  ];
}

// ─── Utility ───────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
