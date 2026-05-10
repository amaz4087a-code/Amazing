import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body as { name?: string };

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: "用户名不能超过50个字符" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name?.trim() },
  });

  return NextResponse.json({ name: user.name });
}
