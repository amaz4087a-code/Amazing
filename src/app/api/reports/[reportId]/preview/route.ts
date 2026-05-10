import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reportStorage } from "@/lib/upload/storage";

export async function GET(
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
    include: { assessment: true },
  });

  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }
  if (!report.fileUrl) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  try {
    const buffer = await reportStorage.get(report.fileUrl);

    if (report.format === "xlsx") {
      // Convert XLSX to HTML table for inline preview
      const { Workbook } = await import("exceljs");
      const wb = new Workbook();
      await wb.xlsx.load(buffer as any);

      const maxFileSize = 5 * 1024 * 1024; // 5MB
      const size = buffer.length;

      if (size > maxFileSize) {
        return new NextResponse(
          htmlPage(
            "文件过大",
            `<p>文件大小 (${(size / 1024 / 1024).toFixed(1)}MB) 超过在线预览限制，请下载查看。</p>`,
          ),
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }

      let tablesHtml = "";
      wb.eachSheet((ws) => {
        tablesHtml += `<h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">${ws.name}</h3>`;
        tablesHtml += '<table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">';

        let rowCount = 0;
        ws.eachRow({ includeEmpty: true }, (row) => {
          if (rowCount > 200) return;
          const cells = row.values as unknown[];
          tablesHtml += "<tr>";
          for (let i = 1; i < cells.length; i++) {
            const val = cells[i] ?? "";
            const tag = rowCount === 0 ? "th" : "td";
            tablesHtml += `<${tag} style="border: 1px solid #ddd; padding: 6px 10px; font-size: 13px; ${rowCount === 0 ? "background: #f5f5f5; font-weight: 600; text-align: left;" : ""}">${escapeHtml(String(val))}</${tag}>`;
          }
          tablesHtml += "</tr>";
          rowCount++;
        });
        tablesHtml += "</table>";
      });

      if (size > 1024 * 1024) {
        tablesHtml += `<p style="font-size: 12px; color: #999; text-align: center;">在线预览与实际格式可能存在差异 · 文件 ${(size / 1024 / 1024).toFixed(1)}MB</p>`;
      }

      return new NextResponse(htmlPage("报告预览 - " + report.title, tablesHtml), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // PDF: return inline for browser preview
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(report.title)}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "文件读取失败" }, { status: 500 });
  }
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #fff; color: #222; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 6px 10px; font-size: 13px; }
    th { background: #f5f5f5; font-weight: 600; text-align: left; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
