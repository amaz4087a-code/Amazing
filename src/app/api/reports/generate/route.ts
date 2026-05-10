import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePdf, generateExcel } from "@/lib/export";
import { reportStorage } from "@/lib/upload/storage";
import { JOINTS, type BodyPartId, BODY_PARTS } from "@/config/joints";
import { INDICATORS, DEFAULT_SCORING_RATIOS } from "@/config/indicators";
import type { ExportData, ExportJointDeviation } from "@/lib/export/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const { assessmentId, format } = body as {
      assessmentId: string;
      format: "pdf" | "xlsx";
    };

    if (!assessmentId || !format) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }
    if (!["pdf", "xlsx"].includes(format)) {
      return NextResponse.json({ error: "不支持的格式" }, { status: 400 });
    }

    // ── Load data ────────────────────────────────────────────────────
    const assessment = await prisma.assessmentSession.findUnique({
      where: { id: assessmentId },
      include: {
        standardMotion: true,
        result: true,
        student: { select: { name: true, email: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }
    if (!assessment.result) {
      return NextResponse.json({ error: "测评尚未完成分析" }, { status: 400 });
    }

    const r = assessment.result;

    // ── Build ExportData ──────────────────────────────────────────────
    const indicatorScores = [
      { id: "accuracy", score: r.accuracyScore },
      { id: "rhythm", score: r.rhythmScore },
      { id: "fluidity", score: r.fluidityScore },
      { id: "explosiveness", score: r.explosivenessScore },
      { id: "extension", score: r.extensionScore },
      { id: "symmetry", score: r.symmetryScore },
      { id: "stability", score: r.stabilityScore },
      { id: "coordination", score: r.coordinationScore },
      { id: "syncRate", score: r.syncRateScore },
      { id: "rangeOfMotion", score: r.rangeOfMotionScore },
      { id: "completeness", score: r.completenessScore },
    ];

    const weights: Record<string, number> = r.indicatorWeights
      ? JSON.parse(r.indicatorWeights)
      : DEFAULT_SCORING_RATIOS;

    const rawJointDevs: Record<string, number> = r.jointDeviations
      ? JSON.parse(r.jointDeviations)
      : {};

    const jointDeviations: ExportJointDeviation[] = Object.entries(rawJointDevs)
      .map(([jointId, deviation]) => {
        const def = JOINTS[jointId];
        return {
          jointId,
          jointLabel: def?.label ?? jointId,
          bodyPart: def ? (BODY_PARTS[def.group as BodyPartId]?.name ?? def.group) : "未知",
          deviation,
        };
      })
      .sort((a, b) => b.deviation - a.deviation);

    const feedbackItems = r.feedbackItems ? JSON.parse(r.feedbackItems) : [];
    const trainingSuggestions = r.trainingSuggestions
      ? JSON.parse(r.trainingSuggestions)
      : [];

    const exportData: ExportData = {
      meta: {
        assessmentId: assessment.id,
        motionName: assessment.standardMotion.name,
        studentName: assessment.student.name ?? assessment.student.email ?? "未知",
        startedAt: new Date(assessment.startedAt).toLocaleString("zh-CN"),
        completedAt: assessment.completedAt
          ? new Date(assessment.completedAt).toLocaleString("zh-CN")
          : "—",
        duration: assessment.duration ?? 0,
        overallScore: r.overallScore,
        analysisDurationMs: r.analysisDurationMs,
        scoringVersion: r.scoringVersion,
      },
      indicators: INDICATORS.map((ind) => {
        const scoreItem = indicatorScores.find((s) => s.id === ind.id);
        return {
          id: ind.id,
          label: ind.name,
          score: scoreItem?.score ?? 0,
          weight: weights[ind.id] ?? DEFAULT_SCORING_RATIOS[ind.id] ?? 0.05,
        };
      }),
      jointDeviations,
      feedbackItems,
      trainingSuggestions,
    };

    // ── Generate file ─────────────────────────────────────────────────
    let buffer: Buffer;
    let ext: string;
    let mime: string;

    if (format === "pdf") {
      buffer = await generatePdf(exportData);
      ext = "pdf";
      mime = "application/pdf";
    } else {
      buffer = await generateExcel(exportData);
      ext = "xlsx";
      mime =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // ── Save to storage ──────────────────────────────────────────────
    const filename = `${assessmentId}-report.${ext}`;
    const filePath = await reportStorage.save(filename, buffer);

    // ── Stat file size ───────────────────────────────────────────────
    const { stat } = await import("fs/promises");
    let fileSize = 0;
    try {
      fileSize = (await stat(filePath)).size;
    } catch { /* ignore */ }

    // ── Create Report record ─────────────────────────────────────────
    const report = await prisma.report.create({
      data: {
        title: `${assessment.standardMotion.name} — 测评报告`,
        assessmentId: assessment.id,
        format: ext,
        fileUrl: filePath,
        fileSize,
      },
    });

    return NextResponse.json({ id: report.id, format: ext });
  } catch (err) {
    console.error("Report generation error:", err);
    const message =
      err instanceof Error ? err.message : "生成报告时发生未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
