import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { courseId } = await params;

  // Verify course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  // Return motions not yet associated with this course
  const motions = await prisma.standardMotion.findMany({
    where: {
      OR: [
        { courseId: null },
        { courseId: { not: courseId } },
      ],
    },
    select: { id: true, name: true, category: true, difficulty: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(motions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { courseId } = await params;
  const { motionIds } = (await req.json()) as { motionIds?: string[] };

  if (!motionIds || !Array.isArray(motionIds) || motionIds.length === 0) {
    return NextResponse.json({ error: "请提供要关联的动作ID" }, { status: 400 });
  }

  // Use transaction to atomically associate all motions
  await prisma.$transaction(
    motionIds.map((motionId) =>
      prisma.standardMotion.update({
        where: { id: motionId },
        data: { courseId },
      }),
    ),
  );

  return NextResponse.json({ ok: true, count: motionIds.length });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { courseId } = await params;
  const { motionIds } = (await req.json()) as { motionIds?: string[] };

  if (!motionIds || !Array.isArray(motionIds) || motionIds.length === 0) {
    return NextResponse.json({ error: "请提供要取消关联的动作ID" }, { status: 400 });
  }

  await prisma.$transaction(
    motionIds.map((motionId) =>
      prisma.standardMotion.update({
        where: { id: motionId },
        data: { courseId: null },
      }),
    ),
  );

  return NextResponse.json({ ok: true, count: motionIds.length });
}
