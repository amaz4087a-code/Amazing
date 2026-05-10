import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AnalyzeButton } from "@/components/assessment/analyze-button";
import { LiveAssessmentView } from "@/components/assessment/live-assessment-view";
import { FeedbackPanel } from "@/components/assessment/feedback-panel";
import { TrainingSuggestions } from "@/components/assessment/training-suggestions";
import type { FeedbackItem, TrainingSuggestion } from "@/lib/assessment/types";
import type { MotionFrameData } from "@/types/motion";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  FAILED: "失败",
};

export default async function AssessmentSessionPage({
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
      userMotionFrames: { take: 1 },
    },
  });

  if (!assessment) notFound();

  const hasUserFrames = assessment.userMotionFrames.length > 0;
  const isCompleted = assessment.status === "COMPLETED";

  // Load standard motion frames for demo playback in LiveAssessmentView
  const standardFrames: MotionFrameData[] = assessment.standardMotion
    ? await prisma.standardMotionFrame
        .findMany({
          where: { standardMotionId: assessment.standardMotionId },
          orderBy: { frameIndex: "asc" },
          take: 300,
        })
        .then((frames) =>
          frames.map((f) => ({
            frameIndex: f.frameIndex,
            timestamp: f.timestamp,
            joints: JSON.parse(f.joints as string),
          })),
        )
    : [];

  const feedbackItems: FeedbackItem[] = assessment.result
    ? JSON.parse(assessment.result.feedbackItems || "[]")
    : [];
  const trainingSuggestions: TrainingSuggestion[] = assessment.result
    ? JSON.parse(assessment.result.trainingSuggestions || "[]")
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/assessment">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回测评列表
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {assessment.name || "测评详情"}
          </h1>
          <p className="text-muted-foreground">
            标准动作: {assessment.standardMotion.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && assessment.result ? (
            <Link href={`/dashboard/assessment/${sessionId}/result`}>
              <Button>查看结果</Button>
            </Link>
          ) : hasUserFrames ? (
            <AnalyzeButton sessionId={sessionId} />
          ) : null}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>测评信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态:</span>
            <Badge
              variant={isCompleted ? "default" : "secondary"}
            >
              {STATUS_LABEL[assessment.status] ?? assessment.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            开始时间: {new Date(assessment.startedAt).toLocaleString("zh-CN")}
          </p>
          {assessment.completedAt && (
            <p className="text-sm text-muted-foreground">
              完成时间:{" "}
              {new Date(assessment.completedAt).toLocaleString("zh-CN")}
            </p>
          )}
          {assessment.duration && (
            <p className="text-sm text-muted-foreground">
              时长: {assessment.duration.toFixed(1)}s
            </p>
          )}
        </CardContent>
      </Card>

      {/* Live Assessment / Recording Area */}
      <Card>
        <CardHeader>
          <CardTitle>实时测评</CardTitle>
        </CardHeader>
        <CardContent>
          {!isCompleted ? (
            <LiveAssessmentView
              sessionId={sessionId}
              standardFrames={standardFrames}
              standardFps={assessment.standardMotion.fps}
            />
          ) : assessment.result ? (
            <div className="space-y-6">
              {feedbackItems.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">动作反馈</h3>
                  <FeedbackPanel items={feedbackItems} />
                </div>
              )}
              {trainingSuggestions.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">训练建议</h3>
                  <TrainingSuggestions suggestions={trainingSuggestions} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
              <div className="text-center">
                <p className="text-muted-foreground">
                  未找到测评数据
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results preview */}
      {isCompleted && assessment.result && (
        <Card>
          <CardHeader>
            <CardTitle>总体评分</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{assessment.result.overallScore}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              分析耗时{" "}
              {(assessment.result.analysisDurationMs / 1000).toFixed(1)}s
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
