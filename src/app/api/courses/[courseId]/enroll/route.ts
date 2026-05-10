import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "STUDENT") {
    return NextResponse.json({ error: "仅学生可报名课程" }, { status: 403 });
  }

  const { courseId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: session.user.id!, courseId } },
  });
  if (existing) {
    return NextResponse.json({ error: "已报名该课程" }, { status: 409 });
  }

  await prisma.enrollment.create({
    data: { studentId: session.user.id!, courseId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { courseId } = await params;

  await prisma.enrollment.deleteMany({
    where: { studentId: session.user.id!, courseId },
  });

  return NextResponse.json({ ok: true });
}
