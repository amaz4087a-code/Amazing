import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { DeleteReportButton } from "@/components/report/delete-report-button";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reports = await prisma.report.findMany({
    include: { assessment: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">测评报告</h1>
        <p className="text-muted-foreground">查看和导出的测评报告</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base leading-tight">
                  {report.title}
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {report.format.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleString("zh-CN")}
              </p>
              {report.fileSize && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(report.fileSize / 1024).toFixed(1)} KB
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/dashboard/reports/${report.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    详情
                  </Button>
                </Link>
                <a href={`/api/reports/${report.id}/download`}>
                  <Button variant="outline" size="sm">
                    <Download className="mr-1 h-3.5 w-3.5" />
                    下载
                  </Button>
                </a>
                <DeleteReportButton reportId={report.id} />
              </div>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            暂无报告，完成测评后可生成
          </p>
        )}
      </div>
    </div>
  );
}
