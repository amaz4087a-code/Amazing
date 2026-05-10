import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      standardMotionId,
      selectedBodyParts,
      scoringRatios,
      rhythmEnabled,
      name,
    } = body;

    if (!standardMotionId) {
      return NextResponse.json({ error: "请选择标准动作" }, { status: 400 });
    }

    const assessment = await prisma.assessmentSession.create({
      data: {
        name: name || "测评任务",
        studentId: (session.user as any).id,
        standardMotionId,
        status: "IN_PROGRESS",
        selectedBodyParts: JSON.stringify(selectedBodyParts || []),
        scoringRatios: JSON.stringify(scoringRatios || {}),
        rhythmEnabled: rhythmEnabled ?? true,
      },
    });

    return NextResponse.json({
      id: assessment.id,
      status: assessment.status,
    });
  } catch (error) {
    console.error("Create assessment error:", error);
    return NextResponse.json({ error: "创建测评失败" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const assessments = await prisma.assessmentSession.findMany({
    where: { studentId: (session.user as any).id },
    include: { standardMotion: true, result: true },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(assessments);
}
