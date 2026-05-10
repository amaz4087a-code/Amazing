import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Activity,
  FileText,
  Users,
  ArrowRight,
  Upload,
  Play,
  BarChart3,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const role = (user as any).role as string | undefined;

  // Real database counts
  const [courseCount, assessmentCount, reportCount, studentCount] =
    await Promise.all([
      prisma.course.count(),
      prisma.assessmentSession.count({
        where: {
          ...(role === "STUDENT" ? { studentId: user.id! } : {}),
          status: "COMPLETED",
        },
      }),
      prisma.report.count({
        where: {
          ...(role === "STUDENT"
            ? { assessment: { studentId: user.id! } }
            : {}),
        },
      }),
      prisma.user.count({ where: { role: "STUDENT" } }),
    ]);

  const stats = [
    {
      title: "课程总数",
      value: courseCount.toString(),
      description: "已创建的课程",
      icon: BookOpen,
    },
    {
      title: "测评次数",
      value: assessmentCount.toString(),
      description: "完成的测评",
      icon: Activity,
    },
    {
      title: "测评报告",
      value: reportCount.toString(),
      description: "已生成的报告",
      icon: FileText,
    },
    {
      title: "学员人数",
      value: studentCount.toString(),
      description: "在读学员",
      icon: Users,
    },
  ];

  const quickActions = [
    {
      label: "上传标准动作",
      description: "建立动作库",
      icon: Upload,
      href: "/dashboard/motions/upload",
    },
    {
      label: "创建测评任务",
      description: "配置评分参数",
      icon: Play,
      href: "/dashboard/assessment/new",
    },
    {
      label: "查看测评结果",
      description: "分析评分报告",
      icon: BarChart3,
      href: "/dashboard/assessment",
    },
  ];

  const systemStatus = [
    { label: "当前版本", value: "v1.0.0", status: "ok" as const },
    { label: "数据库", value: "运行正常", status: "ok" as const },
    { label: "测评引擎", value: "待初始化", status: "warn" as const },
  ];

  function StatusDot({ status }: { status: "ok" | "warn" | "error" }) {
    const colors = {
      ok: "bg-green-500",
      warn: "bg-orange-400",
      error: "bg-red-500",
    };
    return (
      <span
        className={`inline-block h-2 w-2 rounded-full ${colors[status]}`}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          欢迎回来，
          <span className="text-primary">{user.name || "用户"}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">
          这是您的 AI 运动测评系统仪表盘
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">
                  {stat.value}
                </div>
                <CardDescription>{stat.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions + System Status */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-lg border border-border/50 p-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemStatus.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="flex items-center gap-2 text-sm font-medium">
                  <StatusDot status={item.status} />
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
