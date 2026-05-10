import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { JointData } from "@/types/motion";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Verify the session exists and is in progress
    const assessment = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }
    if (assessment.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "测评已结束" }, { status: 400 });
    }

    let frames: { frameIndex: number; timestamp: number; joints: JointData[] }[];
    try {
      const body = await req.json();
      frames = body.frames;
    } catch {
      return NextResponse.json({ error: "无效的请求数据" }, { status: 400 });
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ error: "无效帧数据" }, { status: 400 });
    }

    // Batch insert frames
    const batchSize = 50;
    let inserted = 0;

    try {
      for (let i = 0; i < frames.length; i += batchSize) {
        const batch = frames.slice(i, i + batchSize);
        await prisma.userMotionFrame.createMany({
          data: batch.map((f) => ({
            sessionId,
            frameIndex: f.frameIndex,
            timestamp: f.timestamp,
            joints: JSON.stringify(f.joints),
          })),
        });
        inserted += batch.length;
      }
    } catch (err: any) {
      console.error("Frame insert error:", err);
      return NextResponse.json(
        { error: `数据库写入失败: ${err.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ inserted });
  } catch (err) {
    console.error("Frames API error:", err);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
