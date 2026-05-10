import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { sessionId } = await params;
  const assessment = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      standardMotion: true,
      result: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }

  return NextResponse.json(assessment);
}
