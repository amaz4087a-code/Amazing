/**
 * Generates seed data as SQL INSERT statements for Supabase PostgreSQL.
 * Run: npx tsx scripts/generate-seed-sql.ts > seed_data.sql
 */
import bcrypt from "bcryptjs";

// ─── Joint definitions ────────────────────────────────
const J = [
  "hip_center", "spine", "chest", "neck", "head",
  "left_shoulder", "left_elbow", "left_wrist", "left_hand",
  "right_shoulder", "right_elbow", "right_wrist", "right_hand",
  "left_hip", "left_knee", "left_ankle", "left_foot",
  "right_hip", "right_knee", "right_ankle", "right_foot",
];

const STANDING: { id: string; pos: { x: number; y: number; z: number }; confidence: number }[] = [
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

// ─── Motion generators ───────────────────────────────
function genArmRaise(t: number) {
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
}

function genSquat(t: number) {
  const phase = t < 2 ? t / 2 : 2 - t / 2;
  const depth = Math.sin(phase * Math.PI / 2) * 0.35;
  return [
    { id: "hip_center", pos: { x: 0, y: -depth, z: 0 }, confidence: 0.98 },
    { id: "spine", pos: { x: 0, y: 0.3 - depth, z: 0 }, confidence: 0.98 },
    { id: "chest", pos: { x: 0, y: 0.6 - depth, z: 0 }, confidence: 0.98 },
    { id: "neck", pos: { x: 0, y: 0.8 - depth, z: 0 }, confidence: 0.98 },
    { id: "head", pos: { x: 0, y: 0.95 - depth, z: 0 }, confidence: 0.98 },
    { id: "left_shoulder", pos: { x: -0.2, y: 0.6 - depth, z: -0.1 }, confidence: 0.95 },
    { id: "left_elbow", pos: { x: -0.15, y: 0.35 - depth, z: -0.2 }, confidence: 0.95 },
    { id: "left_wrist", pos: { x: -0.1, y: 0.15 - depth, z: -0.25 }, confidence: 0.95 },
    { id: "left_hand", pos: { x: -0.05, y: 0 - depth, z: -0.25 }, confidence: 0.95 },
    { id: "right_shoulder", pos: { x: 0.2, y: 0.6 - depth, z: -0.1 }, confidence: 0.95 },
    { id: "right_elbow", pos: { x: 0.15, y: 0.35 - depth, z: -0.2 }, confidence: 0.95 },
    { id: "right_wrist", pos: { x: 0.1, y: 0.15 - depth, z: -0.25 }, confidence: 0.95 },
    { id: "right_hand", pos: { x: 0.05, y: 0 - depth, z: -0.25 }, confidence: 0.95 },
    { id: "left_hip", pos: { x: -0.1, y: -0.05 - depth, z: 0 }, confidence: 0.97 },
    { id: "left_knee", pos: { x: -0.15, y: -0.35 - depth, z: 0.1 }, confidence: 0.97 },
    { id: "left_ankle", pos: { x: -0.1, y: -0.85, z: 0 }, confidence: 0.97 },
    { id: "left_foot", pos: { x: -0.1, y: -0.95, z: 0 }, confidence: 0.97 },
    { id: "right_hip", pos: { x: 0.1, y: -0.05 - depth, z: 0 }, confidence: 0.97 },
    { id: "right_knee", pos: { x: 0.15, y: -0.35 - depth, z: 0.1 }, confidence: 0.97 },
    { id: "right_ankle", pos: { x: 0.1, y: -0.85, z: 0 }, confidence: 0.97 },
    { id: "right_foot", pos: { x: 0.1, y: -0.95, z: 0 }, confidence: 0.97 },
  ];
}

function genLunge(t: number) {
  const phase = t < 2 ? t / 2 : 2 - t / 2;
  const step = Math.sin(phase * Math.PI / 2) * 0.3;
  return [
    { id: "hip_center", pos: { x: 0.05 * step, y: -0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.98 },
    { id: "spine", pos: { x: 0.05 * step, y: 0.25 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.98 },
    { id: "chest", pos: { x: 0.05 * step, y: 0.55 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.98 },
    { id: "neck", pos: { x: 0.05 * step, y: 0.75 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.98 },
    { id: "head", pos: { x: 0.05 * step, y: 0.9 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.98 },
    { id: "left_shoulder", pos: { x: -0.15 + 0.05 * step, y: 0.55 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.95 },
    { id: "left_elbow", pos: { x: -0.25 + 0.05 * step, y: 0.4 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.05 }, confidence: 0.95 },
    { id: "left_wrist", pos: { x: -0.2 + 0.05 * step, y: 0.3 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.1 }, confidence: 0.95 },
    { id: "left_hand", pos: { x: -0.15 + 0.05 * step, y: 0.2 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.1 }, confidence: 0.95 },
    { id: "right_shoulder", pos: { x: 0.25 + 0.05 * step, y: 0.55 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0 }, confidence: 0.95 },
    { id: "right_elbow", pos: { x: 0.25 + 0.05 * step, y: 0.35 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.1 }, confidence: 0.95 },
    { id: "right_wrist", pos: { x: 0.2 + 0.05 * step, y: 0.2 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.15 }, confidence: 0.95 },
    { id: "right_hand", pos: { x: 0.15 + 0.05 * step, y: 0.1 - 0.05 * (1 - Math.abs(0.5 - phase) * 2), z: 0.15 }, confidence: 0.95 },
    { id: "left_hip", pos: { x: -0.1, y: -0.05, z: 0 }, confidence: 0.97 },
    { id: "left_knee", pos: { x: -0.1 - step, y: -0.35, z: 0.1 }, confidence: 0.97 },
    { id: "left_ankle", pos: { x: -0.1 - step * 1.5, y: -0.75, z: 0.05 }, confidence: 0.97 },
    { id: "left_foot", pos: { x: -0.1 - step * 1.5, y: -0.85, z: 0.1 }, confidence: 0.97 },
    { id: "right_hip", pos: { x: 0.1, y: -0.05, z: 0 }, confidence: 0.97 },
    { id: "right_knee", pos: { x: 0.1 + step * 0.5, y: -0.35, z: 0 }, confidence: 0.97 },
    { id: "right_ankle", pos: { x: 0.1 + step * 0.5, y: -0.75, z: 0 }, confidence: 0.97 },
    { id: "right_foot", pos: { x: 0.1 + step * 0.5, y: -0.85, z: 0.05 }, confidence: 0.97 },
  ];
}

// ─── Escape helpers ──────────────────────────────────
function esc(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val.toString();
  if (typeof val === "boolean") return val ? "true" : "false";
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function now() {
  return new Date().toISOString();
}

async function main() {
  const lines: string[] = [];
  lines.push("-- SPROTS Seed Data for PostgreSQL");
  lines.push("-- Generated on " + now());
  lines.push("-- Run this in Supabase Dashboard → SQL Editor\n");

  // ─── Users ────────────────────────────────────
  const adminPw = await bcrypt.hash("admin123", 12);
  const teacherPw = await bcrypt.hash("teacher123", 12);
  const studentPw = await bcrypt.hash("student123", 12);

  lines.push("-- Users");
  lines.push(`INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") VALUES`);
  lines.push(`  ('user-admin', 'admin@sprots.com', '系统管理员', ${esc(adminPw)}, 'ADMIN', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") VALUES`);
  lines.push(`  ('user-teacher', 'teacher@sprots.com', '张老师', ${esc(teacherPw)}, 'TEACHER', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") VALUES`);
  lines.push(`  ('user-student', 'student@sprots.com', '李同学', ${esc(studentPw)}, 'STUDENT', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
  lines.push("");

  // ─── Courses ──────────────────────────────────
  lines.push("-- Courses");
  lines.push(`INSERT INTO "Course" (id, name, description, category, "teacherId", "createdAt", "updatedAt") VALUES`);
  lines.push(`  ('course-dance-basic', '基础舞蹈训练', '面向初学者的基础舞蹈动作训练课程，包含基本步伐和上肢动作', 'DANCE', 'user-teacher', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO "Course" (id, name, description, category, "teacherId", "createdAt", "updatedAt") VALUES`);
  lines.push(`  ('course-sports-warmup', '运动热身训练', '标准运动热身动作训练，帮助预防运动损伤', 'SPORTS', 'user-teacher', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
  lines.push("");

  // ─── Enrollments ──────────────────────────────
  lines.push("-- Enrollments");
  lines.push(`INSERT INTO "Enrollment" (id, "studentId", "courseId", "createdAt") VALUES`);
  lines.push(`  ('enroll-1', 'user-student', 'course-dance-basic', ${esc(now())}) ON CONFLICT ("studentId", "courseId") DO NOTHING;`);
  lines.push(`INSERT INTO "Enrollment" (id, "studentId", "courseId", "createdAt") VALUES`);
  lines.push(`  ('enroll-2', 'user-student', 'course-sports-warmup', ${esc(now())}) ON CONFLICT ("studentId", "courseId") DO NOTHING;`);
  lines.push("");

  // ─── Standard Motions ─────────────────────────
  const motions = [
    { id: "motion-arm-raise", name: "基本手臂上举", desc: "双手从身体两侧上举至头顶再还原", category: "DANCE", difficulty: "BEGINNER", tags: ["基础", "手臂", "入门"], fps: 30, duration: 5, gen: genArmRaise, parts: ["head", "torso", "left_arm", "right_arm"] },
    { id: "motion-squat", name: "标准深蹲", desc: "双脚与肩同宽，下蹲至大腿与地面平行后站起", category: "SPORTS", difficulty: "BEGINNER", tags: ["基础", "下肢", "深蹲"], fps: 30, duration: 4, gen: genSquat, parts: ["torso", "left_leg", "right_leg"] },
    { id: "motion-lunge", name: "弓步拉伸", desc: "单脚向前迈出，双膝弯曲呈90度后还原", category: "SPORTS", difficulty: "BEGINNER", tags: ["基础", "下肢", "拉伸"], fps: 30, duration: 4, gen: genLunge, parts: ["torso", "left_leg", "right_leg"] },
  ];

  for (const m of motions) {
    const frameCount = m.fps * m.duration;
    lines.push(`-- Motion: ${m.name}`);
    lines.push(`INSERT INTO "StandardMotion" (id, name, description, category, difficulty, duration, "frameCount", "jointsCount", "jointNames", fps, tags, "isPublic", "relevantBodyParts", "courseId", "teacherId", "createdAt", "updatedAt") VALUES`);
    lines.push(`  (${esc(m.id)}, ${esc(m.name)}, ${esc(m.desc)}, ${esc(m.category)}, ${esc(m.difficulty)}, ${m.duration}, ${frameCount}, ${J.length}, ${esc(JSON.stringify(J))}, ${m.fps}, ${esc(JSON.stringify(m.tags))}, true, ${esc(JSON.stringify(m.parts))}, ${esc(m.id === "motion-arm-raise" ? "course-dance-basic" : "course-sports-warmup")}, 'user-teacher', ${esc(now())}, ${esc(now())}) ON CONFLICT (id) DO NOTHING;`);
    lines.push("");

    // Frames
    lines.push(`-- ${m.name} — ${frameCount} frames`);
    for (let i = 0; i < frameCount; i++) {
      const t = i / m.fps;
      const joints = m.gen(t);
      const frameId = `${m.id}-frame-${i}`;
      lines.push(`INSERT INTO "StandardMotionFrame" (id, "standardMotionId", "frameIndex", timestamp, joints) VALUES (${esc(frameId)}, ${esc(m.id)}, ${i}, ${t}, ${esc(JSON.stringify(joints))}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
}

main().catch(console.error);
