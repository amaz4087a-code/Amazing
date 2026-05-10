import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ScoreRadar } from "@/components/visualization/score-radar";
import { DeviationHeatmap } from "@/components/visualization/deviation-heatmap";
import { FeedbackPanel } from "@/components/assessment/feedback-panel";
import { TrainingSuggestions } from "@/components/assessment/training-suggestions";
import { GenerateReportButton } from "@/components/assessment/generate-report-button";
import type { FeedbackItem, TrainingSuggestion } from "@/lib/assessment/types";

const INDICATOR_META: { id: string; label: string }[] = [
  { id: "accuracy", label: "准确性" },
  { id: "rhythm", label: "节奏感" },
  { id: "fluidity", label: "流畅度" },
  { id: "explosiveness", label: "爆发力" },
  { id: "extension", label: "伸展度" },
  { id: "symmetry", label: "对称性" },
  { id: "stability", label: "稳定性" },
  { id: "coordination", label: "协调性" },
  { id: "syncRate", label: "同步率" },
  { id: "rangeOfMotion", label: "幅度" },
  { id: "completeness", label: "完成度" },
];

function scoreColor(score: number): string {
  if (score >= 85) return "text-primary";
  if (score >= 65) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 45) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { sessionId } = await params;
  const assessment = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      standardMotion: true,
      result: true,
    },
  });

  if (!assessment || !assessment.result) notFound();

  const r = assessment.result;

  const indicatorScores: Record<string, number> = {
    accuracy: r.accuracyScore,
    rhythm: r.rhythmScore,
    fluidity: r.fluidityScore,
    explosiveness: r.explosivenessScore,
    extension: r.extensionScore,
    symmetry: r.symmetryScore,
    stability: r.stabilityScore,
    coordination: r.coordinationScore,
    syncRate: r.syncRateScore,
    rangeOfMotion: r.rangeOfMotionScore,
    completeness: r.completenessScore,
  };

  const jointDeviations: Record<string, number> = JSON.parse(
    r.jointDeviations || "{}",
  );
  const feedbackItems: FeedbackItem[] = JSON.parse(r.feedbackItems || "[]");
  const trainingSuggestions: TrainingSuggestion[] = JSON.parse(
    r.trainingSuggestions || "[]",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/dashboard/assessment/${assessment.id}`}>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回测评详情
            </Button>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">测评结果</h1>
          <p className="text-muted-foreground">
            {assessment.standardMotion.name}
            {" · "}
            {new Date(assessment.startedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <GenerateReportButton assessmentId={assessment.id} />
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="flex flex-col items-center py-8">
          <p className="text-sm text-muted-foreground">总体评分</p>
          <p
            className={`text-6xl font-bold tabular-nums ${scoreColor(r.overallScore)}`}
          >
            {r.overallScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            分析耗时 {(r.analysisDurationMs / 1000).toFixed(1)}s
            {" · "}版本 {r.scoringVersion}
          </p>
        </CardContent>
      </Card>

      {/* Radar Chart + Indicator Cards */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">指标雷达图</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar scores={indicatorScores} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm">细分指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INDICATOR_META.map(({ id, label }) => {
                const score = indicatorScores[id] ?? 0;
                return (
                  <div
                    key={id}
                    className="rounded-lg border bg-muted/20 px-3 py-2.5"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p
                      className={`text-lg font-bold tabular-nums ${scoreColor(score)}`}
                    >
                      {score}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deviation Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">关节偏差热力图</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviationHeatmap
            jointDeviations={jointDeviations}
            feedbackItems={feedbackItems}
          />
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card className="border-l-2 border-l-primary">
        <CardHeader>
          <CardTitle className="text-sm">动作反馈</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackPanel items={feedbackItems} />
        </CardContent>
      </Card>

      {/* Training Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">训练建议</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingSuggestions suggestions={trainingSuggestions} />
        </CardContent>
      </Card>
    </div>
  );
}
