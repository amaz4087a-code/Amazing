import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Users ────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const studentPassword = await bcrypt.hash("student123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sprots.com" },
    update: {},
    create: {
      email: "admin@sprots.com",
      name: "系统管理员",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@sprots.com" },
    update: {},
    create: {
      email: "teacher@sprots.com",
      name: "张老师",
      passwordHash: teacherPassword,
      role: "TEACHER",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@sprots.com" },
    update: {},
    create: {
      email: "student@sprots.com",
      name: "李同学",
      passwordHash: studentPassword,
      role: "STUDENT",
    },
  });

  console.log("  ✓ Users created");

  // ─── Courses ───────────────────────────────────
  const course1 = await prisma.course.upsert({
    where: { id: "course-dance-basic" },
    update: {},
    create: {
      id: "course-dance-basic",
      name: "基础舞蹈训练",
      description: "面向初学者的基础舞蹈动作训练课程，包含基本步伐和上肢动作",
      category: "DANCE",
      teacherId: teacher.id,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { id: "course-sports-warmup" },
    update: {},
    create: {
      id: "course-sports-warmup",
      name: "运动热身训练",
      description: "标准运动热身动作训练，帮助预防运动损伤",
      category: "SPORTS",
      teacherId: teacher.id,
    },
  });

  console.log("  ✓ Courses created");

  // ─── Enrollments ──────────────────────────────
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course1.id } },
    update: {},
    create: {
      studentId: student.id,
      courseId: course1.id,
    },
  });

  console.log("  ✓ Enrollments created");

  // ─── Helper: Build Joints for a Frame ───────────
  const J = [
    "hip_center", "spine", "chest", "neck", "head",
    "left_shoulder", "left_elbow", "left_wrist", "left_hand",
    "right_shoulder", "right_elbow", "right_wrist", "right_hand",
    "left_hip", "left_knee", "left_ankle", "left_foot",
    "right_hip", "right_knee", "right_ankle", "right_foot",
  ];

  function makeJoints(
    getPos: (id: string, t: number) => { x: number; y: number; z: number }
  ) {
    return (t: number) =>
      J.map((id) => ({
        id,
        pos: getPos(id, t),
        confidence: id.startsWith("left_") || id.startsWith("right_") ? 0.95 : 0.98,
      }));
  }

  async function createMotion(
    id: string,
    name: string,
    desc: string,
    category: string,
    difficulty: string,
    tags: string[],
    teacherId: string,
    courseId: string,
    fps: number,
    duration: number,
    frameGen: (t: number) => { id: string; pos: { x: number; y: number; z: number }; confidence: number }[],
    relevantBodyParts?: string[],
  ) {
    const frameCount = fps * duration;
    const motion = await prisma.standardMotion.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        description: desc,
        category,
        difficulty,
        duration,
        frameCount,
        jointsCount: J.length,
        jointNames: JSON.stringify(J),
        fps,
        teacherId,
        courseId,
        isPublic: true,
        tags: JSON.stringify(tags),
        ...(relevantBodyParts ? { relevantBodyParts: JSON.stringify(relevantBodyParts) } : {}),
      },
    });

    // Delete existing frames so regeneration works on re-seed
    await prisma.standardMotionFrame.deleteMany({ where: { standardMotionId: id } });

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const t = i / fps;
      frames.push({
        standardMotionId: motion.id,
        frameIndex: i,
        timestamp: t,
        joints: JSON.stringify(frameGen(t)),
      });
    }

    await prisma.standardMotionFrame.createMany({ data: frames });
    console.log(`  ✓ "${name}" — ${frameCount} frames`);
  }

  const tStanding = makeJoints(() => ({ x: 0, y: 0, z: 0 }));

  // ─── Standing posture helper ──────────────────
  const STANDING = [
    { id: "hip_center", pos: { x: 0, y: 0, z: 0 }, confidence: 0.98 },
    { id: "spine", pos: { x: 0, y: 0.3, z: 0 }, confidence: 0.98 },
    { id: "chest", pos: { x: 0, y: 0.6, z: 0 }, confidence: 0.98 },
    { id: "neck", pos: { x: 0, y: 0.8, z: 0 }, confidence: 0.98 },
    { id: "head", pos: { x: 0, y: 0.95, z: 0 }, confidence: 0.98 },
    { id: "left_shoulder", pos: { x: -0.2, y: 0.6, z: 0 }, confidence: 0.95 },
    { id: "left_elbow", pos: { x: -0.3, y: 0.5, z: 0 }, confidence: 0.95 },
    { id: "left_wrist", pos: { x: -0.25, y: 0.4, z: 0 }, confidence: 0.95 },
    { id: "left_hand", pos: { x: -0.2, y: 0.3, z: 0 }, confidence: 0.95 },
    { id: "right_shoulder", pos: { x: 0.2, y: 0.6, z: 0 }, confidence: 0.95 },
    { id: "right_elbow", pos: { x: 0.3, y: 0.5, z: 0 }, confidence: 0.95 },
    { id: "right_wrist", pos: { x: 0.25, y: 0.4, z: 0 }, confidence: 0.95 },
    { id: "right_hand", pos: { x: 0.2, y: 0.3, z: 0 }, confidence: 0.95 },
    { id: "left_hip", pos: { x: -0.1, y: -0.05, z: 0 }, confidence: 0.97 },
    { id: "left_knee", pos: { x: -0.1, y: -0.45, z: 0 }, confidence: 0.97 },
    { id: "left_ankle", pos: { x: -0.1, y: -0.85, z: 0 }, confidence: 0.97 },
    { id: "left_foot", pos: { x: -0.1, y: -0.95, z: 0.05 }, confidence: 0.97 },
    { id: "right_hip", pos: { x: 0.1, y: -0.05, z: 0 }, confidence: 0.97 },
    { id: "right_knee", pos: { x: 0.1, y: -0.45, z: 0 }, confidence: 0.97 },
    { id: "right_ankle", pos: { x: 0.1, y: -0.85, z: 0 }, confidence: 0.97 },
    { id: "right_foot", pos: { x: 0.1, y: -0.95, z: 0.05 }, confidence: 0.97 },
  ];

  function s(idx: number, override?: Partial<{ x: number; y: number; z: number }>) {
    const j = STANDING[idx];
    if (!override) return j;
    return { ...j, pos: { ...j.pos, ...override } };
  }

  // ─── Motion 1: Basic arm raise ─────────────────
  await createMotion(
    "motion-arm-raise", "基本手臂上举",
    "双手从身体两侧上举至头顶再还原", "DANCE", "BEGINNER",
    ["基础", "手臂", "入门"], teacher.id, course1.id, 30, 5,
    (t) => {
      const phase = t < 2.5 ? t / 2.5 : 2 - t / 2.5;
      const armH = Math.sin(phase * Math.PI / 2);
      return [
        s(0), s(1), s(2), s(3), s(4),
        s(5),
        s(6, { y: 0.5 + armH * 0.4, x: -0.3 + armH * 0.2 }),
        s(7, { y: 0.4 + armH * 0.6, x: -0.25 + armH * 0.2 }),
        s(8, { y: 0.3 + armH * 0.7, x: -0.2 + armH * 0.2 }),
        s(9),
        s(10, { y: 0.5 + armH * 0.4, x: 0.3 - armH * 0.2 }),
        s(11, { y: 0.4 + armH * 0.6, x: 0.25 - armH * 0.2 }),
        s(12, { y: 0.3 + armH * 0.7, x: 0.2 - armH * 0.2 }),
        s(13), s(14), s(15), s(16),
        s(17), s(18), s(19), s(20),
      ];
    },
    ["head", "torso", "left_arm", "right_arm"],
  );

  // ─── Motion 2: Squat ──────────────────────────
  await createMotion(
    "motion-squat", "标准深蹲",
    "双脚与肩同宽，下蹲至大腿与地面平行后站起", "SPORTS", "BEGINNER",
    ["基础", "下肢", "深蹲"], teacher.id, course2.id, 30, 4,
    (t) => {
      const phase = t < 2 ? t / 2 : 2 - t / 2; // 0→1→0
      const depth = Math.sin(phase * Math.PI / 2) * 0.35;
      return [
        // Torso moves down with hips
        { id: "hip_center", pos: { x: 0, y: -depth, z: 0 }, confidence: 0.98 },
        { id: "spine", pos: { x: 0, y: 0.3 - depth, z: 0 }, confidence: 0.98 },
        { id: "chest", pos: { x: 0, y: 0.6 - depth, z: 0 }, confidence: 0.98 },
        { id: "neck", pos: { x: 0, y: 0.8 - depth, z: 0 }, confidence: 0.98 },
        { id: "head", pos: { x: 0, y: 0.95 - depth, z: 0 }, confidence: 0.98 },
        // Arms forward for balance
        { id: "left_shoulder", pos: { x: -0.2, y: 0.6 - depth, z: -0.1 }, confidence: 0.95 },
        { id: "left_elbow", pos: { x: -0.15, y: 0.35 - depth, z: -0.2 }, confidence: 0.95 },
        { id: "left_wrist", pos: { x: -0.1, y: 0.15 - depth, z: -0.25 }, confidence: 0.95 },
        { id: "left_hand", pos: { x: -0.05, y: 0 - depth, z: -0.25 }, confidence: 0.95 },
        { id: "right_shoulder", pos: { x: 0.2, y: 0.6 - depth, z: -0.1 }, confidence: 0.95 },
        { id: "right_elbow", pos: { x: 0.15, y: 0.35 - depth, z: -0.2 }, confidence: 0.95 },
        { id: "right_wrist", pos: { x: 0.1, y: 0.15 - depth, z: -0.25 }, confidence: 0.95 },
        { id: "right_hand", pos: { x: 0.05, y: 0 - depth, z: -0.25 }, confidence: 0.95 },
        // Legs bend
        { id: "left_hip", pos: { x: -0.1, y: -0.05 - depth, z: 0 }, confidence: 0.97 },
        { id: "left_knee", pos: { x: -0.15, y: -0.35 - depth, z: 0.1 }, confidence: 0.97 },
        { id: "left_ankle", pos: { x: -0.1, y: -0.85, z: 0 }, confidence: 0.97 },
        { id: "left_foot", pos: { x: -0.1, y: -0.95, z: 0 }, confidence: 0.97 },
        { id: "right_hip", pos: { x: 0.1, y: -0.05 - depth, z: 0 }, confidence: 0.97 },
        { id: "right_knee", pos: { x: 0.15, y: -0.35 - depth, z: 0.1 }, confidence: 0.97 },
        { id: "right_ankle", pos: { x: 0.1, y: -0.85, z: 0 }, confidence: 0.97 },
        { id: "right_foot", pos: { x: 0.1, y: -0.95, z: 0 }, confidence: 0.97 },
      ];
    },
    ["torso", "left_leg", "right_leg"],
  );

  // ─── Motion 3: Forward lunge ─────────────────
  await createMotion(
    "motion-lunge", "弓步拉伸",
    "单脚向前迈出，双膝弯曲呈90度后还原", "SPORTS", "BEGINNER",
    ["基础", "下肢", "弓步"], teacher.id, course2.id, 30, 4,
    (t) => {
      const phase = t < 2 ? t / 2 : 2 - t / 2; // 0→1→0
      const step = phase * 0.3;
      return [
        tStanding(t)[0], tStanding(t)[1], tStanding(t)[2], tStanding(t)[3], tStanding(t)[4],
        tStanding(t)[5], tStanding(t)[6], tStanding(t)[7], tStanding(t)[8],
        tStanding(t)[9], tStanding(t)[10], tStanding(t)[11], tStanding(t)[12],
        // Left leg — steps back
        { id: "left_hip", pos: { x: -0.1 - step*0.5, y: -0.05, z: 0 }, confidence: 0.97 },
        { id: "left_knee", pos: { x: -0.1 - step*0.3, y: -0.35, z: 0.05 }, confidence: 0.97 },
        { id: "left_ankle", pos: { x: -0.1 - step, y: -0.85, z: 0 }, confidence: 0.97 },
        { id: "left_foot", pos: { x: -0.1 - step, y: -0.95, z: 0 }, confidence: 0.97 },
        // Right leg — steps forward, knee bends
        { id: "right_hip", pos: { x: 0.1 + step*0.5, y: -0.05, z: 0 }, confidence: 0.97 },
        { id: "right_knee", pos: { x: 0.1 + step*0.3, y: -0.25 + phase*0.15, z: 0 }, confidence: 0.97 },
        { id: "right_ankle", pos: { x: 0.1 + step, y: -0.85, z: 0 }, confidence: 0.97 },
        { id: "right_foot", pos: { x: 0.1 + step, y: -0.95, z: 0.05 }, confidence: 0.97 },
      ];
    },
    ["torso", "left_leg", "right_leg"],
  );

  console.log("\nSeed completed! Test accounts:");
  console.log("  Admin:   admin@sprots.com / admin123");
  console.log("  Teacher: teacher@sprots.com / teacher123");
  console.log("  Student: student@sprots.com / student123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
