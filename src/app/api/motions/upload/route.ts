import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseMotionFile } from "@/lib/motion/parser";
import { motionStorage } from "@/lib/upload/storage";
import { z } from "zod";

const ALLOWED_MIMES = ["application/json", "text/csv", "text/plain"];
const ALLOWED_EXTS = [".json", ".csv"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const CATEGORIES = ["DANCE", "FITNESS", "SPORTS", "REHAB", "MARTIAL_ARTS", "OTHER"] as const;
const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

const metaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(CATEGORIES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  tags: z.string().max(500).optional(),
  isPublic: z.string().optional(),
  courseId: z.string().optional(),
});

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_一-鿿\-]/g, "_").substring(0, 200);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // ── File type validation ──────────────────────────────────────
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: `不支持的文件格式，仅允许: ${ALLOWED_EXTS.join(", ")}` },
        { status: 400 },
      );
    }
    if (file.type && !ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: "无效的文件类型" },
        { status: 400 },
      );
    }

    // ── File size validation ──────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件过大，最大允许 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "文件为空" }, { status: 400 });
    }

    // ── Metadata validation ───────────────────────────────────────
    const metaRaw = {
      name: formData.get("name") as string | undefined,
      description: formData.get("description") as string | undefined,
      category: formData.get("category") as string | undefined,
      difficulty: formData.get("difficulty") as string | undefined,
      tags: formData.get("tags") as string | undefined,
      isPublic: formData.get("isPublic") as string | undefined,
      courseId: formData.get("courseId") as string | undefined,
    };
    const metaResult = metaSchema.safeParse(metaRaw);
    if (!metaResult.success) {
      return NextResponse.json(
        { error: "参数校验失败", details: metaResult.error.flatten() },
        { status: 400 },
      );
    }
    const meta = metaResult.data;

    const name = meta.name || sanitizeName(file.name.replace(/\.[^/.]+$/, ""));
    const description = meta.description || "";
    const category = meta.category || "DANCE";
    const difficulty = meta.difficulty || "BEGINNER";

    // ── Sanitize filename ─────────────────────────────────────────
    const safeFilename = sanitizeName(file.name);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse motion file
    const parsed = parseMotionFile(buffer, file.name);

    // Save original file to storage
    const fileUrl = await motionStorage.save(safeFilename, buffer);

    // Create motion record
    const motion = await prisma.standardMotion.create({
      data: {
        name,
        description,
        category,
        difficulty,
        duration: parsed.duration,
        frameCount: parsed.frameCount,
        jointsCount: parsed.jointNames.length,
        jointNames: JSON.stringify(parsed.jointNames),
        fps: parsed.fps,
        fileUrl,
        tags: JSON.stringify(meta.tags ? meta.tags.split(",").map(t => t.trim()) : []),
        isPublic: meta.isPublic === "true",
        courseId: meta.courseId ?? null,
        teacherId: (session.user as any).id,
      },
    });

    // Batch insert frames
    const frameData = parsed.frames.map((f) => ({
      standardMotionId: motion.id,
      frameIndex: f.frameIndex,
      timestamp: f.timestamp,
      joints: JSON.stringify(f.joints),
    }));

    // Insert in batches of 100
    for (let i = 0; i < frameData.length; i += 100) {
      await prisma.standardMotionFrame.createMany({
        data: frameData.slice(i, i + 100),
      });
    }

    return NextResponse.json({
      id: motion.id,
      name: motion.name,
      frameCount: motion.frameCount,
      duration: motion.duration,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "上传失败" },
      { status: 500 }
    );
  }
}
