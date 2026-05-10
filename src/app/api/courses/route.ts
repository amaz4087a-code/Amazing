import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, thumbnail } = body as {
    name?: string;
    description?: string;
    category?: string;
    thumbnail?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "课程名称不能为空" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category || "GENERAL",
      thumbnail: thumbnail || null,
      teacherId: session.user.id!,
    },
  });

  return NextResponse.json(course);
}
