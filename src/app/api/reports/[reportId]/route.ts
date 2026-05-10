import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reportStorage } from "@/lib/upload/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { reportId } = await params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  // Delete file from storage
  if (report.fileUrl) {
    try {
      await reportStorage.delete(report.fileUrl);
    } catch {
      // File may already be deleted
    }
  }

  // Delete DB record
  await prisma.report.delete({ where: { id: reportId } });

  return NextResponse.json({ deleted: true });
}
