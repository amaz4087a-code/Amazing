import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EnrollButtons } from "./enroll-buttons";
import { MotionManager } from "@/components/course/motion-manager";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const userId = session.user.id!;
  const isStudent = role === "STUDENT";
  const isTeacherOrAdmin = role === "TEACHER" || role === "ADMIN";

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      enrollments: {
        include: { student: true },
        ...(isStudent ? { where: { studentId: userId } } : {}),
      },
      standardMotions: true,
    },
  });

  if (!course) notFound();

  const isEnrolled = isStudent && course.enrollments.length > 0;

  // For teachers, get all enrollments
  const allEnrollments = isTeacherOrAdmin
    ? await prisma.enrollment.findMany({
        where: { courseId },
        include: { student: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/courses">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回课程列表
          </Button>
        </Link>

        {course.thumbnail && (
          <div className="mb-4 overflow-hidden rounded-lg border">
            <img
              src={course.thumbnail}
              alt={course.name}
              className="h-48 w-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.name}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          {isStudent && (
            <EnrollButtons
              courseId={course.id}
              isEnrolled={isEnrolled}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">教师</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{course.teacher.name || "未知"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">分类</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{course.category}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">学员数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {isTeacherOrAdmin ? allEnrollments.length : course.enrollments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Student list for teachers/admins */}
      {isTeacherOrAdmin && allEnrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">学员列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {allEnrollments.map((enr) => (
                <div key={enr.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{enr.student.name || "未知"}</p>
                    <p className="text-xs text-muted-foreground">{enr.student.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>标准动作</CardTitle>
            {isTeacherOrAdmin && (
              <MotionManager
                courseId={course.id}
                initialMotions={course.standardMotions.map((m) => ({
                  id: m.id,
                  name: m.name,
                  category: m.category,
                  difficulty: m.difficulty,
                }))}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {course.standardMotions.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无关联的标准动作</p>
          ) : (
            <div className="space-y-2">
              {course.standardMotions.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.frameCount} 帧 · {m.difficulty}
                    </p>
                  </div>
                  <Badge variant="outline">{m.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
