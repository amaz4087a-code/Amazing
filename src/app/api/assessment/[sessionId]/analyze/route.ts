import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeAssessment } from "@/lib/assessment/analyzer";
import type { JointData } from "@/types/motion";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { sessionId } = await params;

  // --- Load assessment session ---
  const assessment = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      standardMotion: { include: { frames: { orderBy: { frameIndex: "asc" } } } },
      userMotionFrames: { orderBy: { frameIndex: "asc" } },
      result: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }
  if (assessment.status === "COMPLETED" && assessment.result) {
    // Already analysed — return existing
    return NextResponse.json({ id: assessment.result.id, status: "ALREADY_COMPLETED" });
  }

  // --- Validate data ---
  if (assessment.standardMotion.frames.length === 0) {
    return NextResponse.json({ error: "标准动作无帧数据" }, { status: 400 });
  }
  if (assessment.userMotionFrames.length === 0) {
    return NextResponse.json({ error: "用户未录制动作帧" }, { status: 400 });
  }

  // --- Parse configuration ---
  const selectedBodyParts: string[] = assessment.selectedBodyParts
    ? JSON.parse(assessment.selectedBodyParts)
    : [];

  // Derive selected joint IDs from body parts
  const { JOINTS } = await import("@/config/joints");
  const selectedJointIds = new Set<string>();
  if (selectedBodyParts.length > 0) {
    for (const [id, def] of Object.entries(JOINTS)) {
      if (selectedBodyParts.includes(def.group)) {
        selectedJointIds.add(id);
      }
    }
  } else {
    // All joints
    for (const id of Object.keys(JOINTS)) {
      selectedJointIds.add(id);
    }
  }

  const scoringRatios: Record<string, number> = assessment.scoringRatios
    ? JSON.parse(assessment.scoringRatios)
    : {};

  const rhythmEnabled = assessment.rhythmEnabled;

  // --- Parse frames ---
  const standardFrames: { joints: JointData[] }[] =
    assessment.standardMotion.frames.map((f) => ({
      joints: JSON.parse(f.joints) as JointData[],
    }));

  const userFrames: { joints: JointData[] }[] =
    assessment.userMotionFrames.map((f) => ({
      joints: JSON.parse(f.joints) as JointData[],
    }));

  // --- Run analysis ---
  try {
    const result = analyzeAssessment(standardFrames, userFrames, {
      selectedJointIds,
      scoringRatios,
      rhythmEnabled,
    });

    // --- Persist result ---
    const saved = await prisma.assessmentResult.create({
      data: {
        sessionId: assessment.id,
        overallScore: result.overallScore,

        accuracyScore: result.indicatorScores.accuracy,
        rhythmScore: result.indicatorScores.rhythm,
        fluidityScore: result.indicatorScores.fluidity,
        explosivenessScore: result.indicatorScores.explosiveness,
        extensionScore: result.indicatorScores.extension,
        symmetryScore: result.indicatorScores.symmetry,
        stabilityScore: result.indicatorScores.stability,
        coordinationScore: result.indicatorScores.coordination,
        syncRateScore: result.indicatorScores.syncRate,
        rangeOfMotionScore: result.indicatorScores.rangeOfMotion,
        completenessScore: result.indicatorScores.completeness,

        jointDeviations: JSON.stringify(result.jointDeviations),
        temporalDeviations: "[]",
        frameScores: "{}",

        feedbackItems: JSON.stringify(result.feedbackItems),
        trainingSuggestions: JSON.stringify(result.trainingSuggestions),

        indicatorWeights: JSON.stringify(scoringRatios),
        analysisDurationMs: result.analysisDurationMs,
        scoringVersion: "1.0.0",
      },
    });

    // Mark session as COMPLETED
    await prisma.assessmentSession.update({
      where: { id: assessment.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        duration:
          (Date.now() - new Date(assessment.startedAt).getTime()) / 1000,
      },
    });

    return NextResponse.json({ id: saved.id, status: "COMPLETED" });
  } catch (err) {
    console.error("Analysis failed:", err);
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `分析过程出错: ${message}` },
      { status: 500 },
    );
  }
}
