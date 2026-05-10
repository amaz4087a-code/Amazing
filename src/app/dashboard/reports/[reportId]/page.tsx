import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, ArrowLeft } from "lucide-react";
import { DeleteReportButton } from "@/components/report/delete-report-button";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { reportId } = await params;
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { assessment: { include: { result: true } } },
  });

  if (!report) notFound();

  const isPdf = report.format === "pdf";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {report.title}
            </h1>
            <Badge variant="outline">
              {report.format.toUpperCase()}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(report.createdAt).toLocaleString("zh-CN")}
            {report.fileSize && (
              <> · {(report.fileSize / 1024).toFixed(1)} KB</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/reports/${report.id}/download`}>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
          </a>
          <DeleteReportButton reportId={report.id} />
        </div>
      </div>

      {/* Score summary */}
      {report.assessment.result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">关联测评</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">总体评分: </span>
              <span className="font-bold text-lg">
                {report.assessment.result.overallScore}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">分析耗时: </span>
              <span>
                {(report.assessment.result.analysisDurationMs / 1000).toFixed(
                  1,
                )}
                s
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">报告预览</CardTitle>
        </CardHeader>
        <CardContent>
          {isPdf ? (
            <iframe
              src={`/api/reports/${report.id}/preview`}
              className="h-[600px] w-full rounded-lg border"
              title="PDF Preview"
            />
          ) : (
            <iframe
              src={`/api/reports/${report.id}/preview`}
              className="h-[600px] w-full rounded-lg border"
              title="Excel Preview"
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground text-center">
            在线预览与实际格式可能存在差异，建议下载查看原文件。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
