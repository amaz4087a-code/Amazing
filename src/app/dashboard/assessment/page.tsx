import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusLabels: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  ANALYZING: "分析中",
  FAILED: "失败",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  ANALYZING: "outline",
  FAILED: "destructive",
};

export default async function AssessmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessions = await prisma.assessmentSession.findMany({
    include: { standardMotion: true },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">AI 测评</h1>
          <p className="text-muted-foreground">创建和管理运动测评任务</p>
        </div>
        <Link href="/dashboard/assessment/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建测评
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => (
          <Link key={s.id} href={`/dashboard/assessment/${s.id}`}>
            <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{s.name || "测评任务"}</CardTitle>
                  <Badge variant={statusColors[s.status] as any}>
                    {statusLabels[s.status] || s.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  标准动作: {s.standardMotion.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(s.startedAt).toLocaleString("zh-CN")}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {sessions.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            暂无测评记录，点击上方按钮创建
          </p>
        )}
      </div>
    </div>
  );
}
