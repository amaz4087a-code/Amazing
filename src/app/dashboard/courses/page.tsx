import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const userId = session.user.id!;
  const isStudent = role === "STUDENT";

  const courses = await prisma.course.findMany({
    include: {
      teacher: true,
      _count: { select: { enrollments: true } },
      ...(isStudent ? {
        enrollments: {
          where: { studentId: userId },
          select: { id: true },
        },
      } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">课程管理</h1>
          <p className="text-muted-foreground">
            {isStudent ? "浏览可选课程" : "管理和查看所有课程"}
          </p>
        </div>
        {!isStudent && (
          <Link href="/dashboard/courses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新建课程
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course: any) => (
          <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
            <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  {isStudent && course.enrollments?.length > 0 && (
                    <Badge variant="secondary">已报名</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description || "暂无描述"}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>教师: {course.teacher.name || "未知"}</span>
                  <span>{course._count.enrollments} 名学员</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {courses.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            暂无课程
          </p>
        )}
      </div>
    </div>
  );
}
