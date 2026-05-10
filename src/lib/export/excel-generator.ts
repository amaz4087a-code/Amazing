import type { ExportData, ExportJointDeviation } from "./types";

// ─── Dynamic import ────────────────────────────────────────────────────

async function getExcelJS() {
  return import("exceljs");
}

// ─── Main ─────────────────────────────────────────────────────────────

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const Excel = await getExcelJS();
  const wb = new Excel.Workbook();

  wb.creator = "AI 运动测评系统";
  wb.created = new Date();

  // ── Sheet 1: Summary ─────────────────────────────────────────────
  const summary = wb.addWorksheet("总分", {
    views: [{ showGridLines: true }],
  });

  // Meta info
  summary.addRow(["AI 运动测评报告"]);
  summary.addRow([]);
  summary.addRow(["测评编号", data.meta.assessmentId]);
  summary.addRow(["标准动作", data.meta.motionName]);
  summary.addRow(["学生", data.meta.studentName]);
  summary.addRow(["开始时间", data.meta.startedAt]);
  summary.addRow(["完成时间", data.meta.completedAt]);
  summary.addRow(["分析耗时", `${(data.meta.analysisDurationMs / 1000).toFixed(1)}s`]);
  summary.addRow(["评分版本", data.meta.scoringVersion]);
  summary.addRow([]);

  // Overall score
  summary.addRow(["总体评分", data.meta.overallScore]);
  const overallRow = summary.lastRow;
  if (overallRow) {
    overallRow.getCell(1).font = { bold: true, size: 14 };
    overallRow.getCell(2).font = { bold: true, size: 18 };
  }
  summary.addRow([]);

  // Indicator scores
  const headerRow = summary.addRow(["指标", "得分", "权重"]);
  headerRow.font = { bold: true };

  for (const ind of data.indicators) {
    const row = summary.addRow([ind.label, ind.score, `${(ind.weight * 100).toFixed(0)}%`]);
    // Colour-code the score cell
    const cell = row.getCell(2);
    if (ind.score >= 85) cell.font = { color: { argb: "FF16A34A" } };
    else if (ind.score >= 65) cell.font = { color: { argb: "FFCA8A04" } };
    else if (ind.score >= 45) cell.font = { color: { argb: "FFEA580C" } };
    else cell.font = { color: { argb: "FFDC2626" } };
  }

  // Column widths
  summary.getColumn(1).width = 18;
  summary.getColumn(2).width = 16;
  summary.getColumn(3).width = 12;

  // ── Sheet 2: Joint Deviations ────────────────────────────────────
  const devSheet = wb.addWorksheet("关节偏差", {
    views: [{ showGridLines: true }],
  });

  const devHeader = devSheet.addRow(["关节", "部位", "偏差(m)", "程度"]);
  devHeader.font = { bold: true };

  const sorted = [...data.jointDeviations].sort(
    (a, b) => b.deviation - a.deviation,
  );

  for (const d of sorted) {
    const level =
      d.deviation > 0.1 ? "严重" : d.deviation > 0.05 ? "中等" : "轻微";
    const row = devSheet.addRow([d.jointLabel, d.bodyPart, d.deviation.toFixed(3), level]);
    const cell = row.getCell(4);
    if (d.deviation > 0.1) cell.font = { color: { argb: "FFDC2626" } };
    else if (d.deviation > 0.05) cell.font = { color: { argb: "FFCA8A04" } };
    else cell.font = { color: { argb: "FF16A34A" } };
  }

  devSheet.getColumn(1).width = 16;
  devSheet.getColumn(2).width = 14;
  devSheet.getColumn(3).width = 14;
  devSheet.getColumn(4).width = 12;

  // ── Sheet 3: Feedback & Suggestions ──────────────────────────────
  const fbSheet = wb.addWorksheet("反馈与建议", {
    views: [{ showGridLines: true }],
  });

  if (data.feedbackItems.length > 0) {
    fbSheet.addRow(["动作反馈"]);
    fbSheet.addRow([]);

    const fbHeader = fbSheet.addRow(["部位", "问题", "严重程度", "描述", "建议"]);
    fbHeader.font = { bold: true };

    for (const fb of data.feedbackItems) {
      fbSheet.addRow([
        fb.bodyPart,
        fb.issue,
        fb.severity === "high" ? "高" : fb.severity === "medium" ? "中" : "低",
        fb.description,
        fb.suggestion,
      ]);
    }
  }

  fbSheet.addRow([]);

  if (data.trainingSuggestions.length > 0) {
    fbSheet.addRow(["训练建议"]);
    fbSheet.addRow([]);

    const tsHeader = fbSheet.addRow(["领域", "优先级", "建议"]);
    tsHeader.font = { bold: true };

    for (const ts of data.trainingSuggestions) {
      const row = fbSheet.addRow([
        ts.area,
        ts.priority === "high" ? "优先" : ts.priority === "medium" ? "建议" : "可选",
        ts.suggestion,
      ]);

      if (ts.exercises.length > 0) {
        for (const ex of ts.exercises) {
          fbSheet.addRow(["", "", `练习: ${ex.name} — ${ex.description}`]);
        }
      }
    }
  }

  fbSheet.getColumn(1).width = 16;
  fbSheet.getColumn(2).width = 14;
  fbSheet.getColumn(3).width = 14;
  fbSheet.getColumn(4).width = 40;
  fbSheet.getColumn(5).width = 40;

  // ── Write to buffer ──────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
