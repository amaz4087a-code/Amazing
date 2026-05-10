import path from "path";
import type { ExportData, ExportIndicator, ExportJointDeviation } from "./types";

// ─── PDFKit dynamic import —───────────────────────────────────────────

async function getPDFKit() {
  const PDFDocument = (await import("pdfkit")).default;
  return PDFDocument;
}

// ─── Font path —───────────────────────────────────────────────────────

function fontPath(): string {
  return path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf");
}

// ─── Score colour —────────────────────────────────────────────────────

function scoreColour(s: number): string {
  if (s >= 85) return "#16a34a";
  if (s >= 65) return "#ca8a04";
  if (s >= 45) return "#ea580c";
  return "#dc2626";
}

// ─── Main —────────────────────────────────────────────────────────────

export async function generatePdf(data: ExportData): Promise<Buffer> {
  const PDFDocument = await getPDFKit();
  const font = fontPath();

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  // Collect chunks into a buffer
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Register font ──────────────────────────────────────────────
    doc.registerFont("NotoSans", font);

    // ── Title Page ─────────────────────────────────────────────────
    doc.font("NotoSans").fontSize(26).fillColor("#111827");
    doc.text("AI 运动测评报告", { align: "center" });
    doc.moveDown(0.5);

    doc.fontSize(12).fillColor("#6b7280");
    doc.text(data.meta.motionName, { align: "center" });
    doc.moveDown(2);

    // Overall score
    doc.fontSize(48).fillColor(scoreColour(data.meta.overallScore));
    doc.text(`${data.meta.overallScore}`, { align: "center" });
    doc.moveDown(0.3);

    doc.fontSize(11).fillColor("#6b7280");
    doc.text("总体评分", { align: "center" });
    doc.moveDown(3);

    // Meta info table
    const metaRows: [string, string][] = [
      ["测评编号", data.meta.assessmentId],
      ["标准动作", data.meta.motionName],
      ["学生", data.meta.studentName],
      ["开始时间", data.meta.startedAt],
      ["完成时间", data.meta.completedAt],
      ["分析耗时", `${(data.meta.analysisDurationMs / 1000).toFixed(1)}s`],
      ["评分版本", data.meta.scoringVersion],
    ];

    doc.fontSize(10).fillColor("#374151");
    const metaLeft = 120;
    const metaRight = 380;
    let y = doc.y;

    for (const [label, value] of metaRows) {
      doc.font("NotoSans").fillColor("#6b7280").text(label, metaLeft, y);
      doc.font("NotoSans").fillColor("#111827").text(value, metaRight, y);
      y += 18;
    }

    // ── New Page: Indicators ──────────────────────────────────────
    doc.addPage();
    doc.font("NotoSans").fontSize(18).fillColor("#111827");
    doc.text("评分指标", { align: "left" });
    doc.moveDown(1);

    drawIndicatorTable(doc, data.indicators);

    // ── New Page: Joint Deviations ─────────────────────────────────
    doc.addPage();
    doc.font("NotoSans").fontSize(18).fillColor("#111827");
    doc.text("关节偏差", { align: "left" });
    doc.moveDown(1);

    drawDeviationTable(doc, data.jointDeviations);

    // ── New Page: Feedback ─────────────────────────────────────────
    if (data.feedbackItems.length > 0) {
      doc.addPage();
      doc.font("NotoSans").fontSize(18).fillColor("#111827");
      doc.text("动作反馈", { align: "left" });
      doc.moveDown(1);

      for (const fb of data.feedbackItems) {
        const sevColour =
          fb.severity === "high"
            ? "#dc2626"
            : fb.severity === "medium"
              ? "#ca8a04"
              : "#16a34a";

        drawFeedbackItem(doc, fb.bodyPart, fb.issue, sevColour, fb.description, fb.suggestion);
        doc.moveDown(0.5);
      }
    }

    // ── Training Suggestions ──────────────────────────────────────
    if (data.trainingSuggestions.length > 0) {
      // Only add a page break if the current page already has feedback content
      const needsPageBreak = data.feedbackItems.length > 0;
      if (needsPageBreak) {
        doc.addPage();
      }
      doc.font("NotoSans").fontSize(18).fillColor("#111827");
      doc.text("训练建议", { align: "left" });
      doc.moveDown(1);

      for (const ts of data.trainingSuggestions) {
        const prioColour =
          ts.priority === "high"
            ? "#dc2626"
            : ts.priority === "medium"
              ? "#ca8a04"
              : "#16a34a";

        drawSuggestion(doc, ts.area, prioColour, ts.suggestion, ts.exercises);
        doc.moveDown(0.8);
      }
    }

    // ── Footer page numbers ────────────────────────────────────────
    let pageCount = 0;
    doc.on("pageAdded", () => {
      pageCount++;
      const oldY = doc.y;
      doc.font("NotoSans").fontSize(8).fillColor("#9ca3af");
      doc.text(
        `— ${pageCount} —`,
        50,
        doc.page.height - 40,
        { align: "center", width: doc.page.width - 100 },
      );
      doc.y = oldY;
    });
    // Trigger final page count on the last page
    pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.font("NotoSans").fontSize(8).fillColor("#9ca3af");
      doc.text(
        `— ${i + 1} —`,
        50,
        doc.page.height - 40,
        { align: "center", width: doc.page.width - 100 },
      );
    }

    doc.end();
  });
}

// ─── Draw helpers ─────────────────────────────────────────────────────

function drawIndicatorTable(
  doc: PDFKit.PDFDocument,
  indicators: ExportIndicator[],
) {
  const colX = [50, 60, 400, 490];
  const rowH = 22;
  let y = doc.y;

  // Header
  doc.fontSize(9).fillColor("#6b7280");
  doc.text("序号", colX[1], y + 6, { width: 40 });
  doc.text("指标", colX[2] - 30, y + 6, { width: 160 });
  doc.text("权重", colX[3] - 20, y + 6, { width: 50 });
  doc.text("得分", colX[3] + 40, y + 6, { width: 50 });
  y += rowH;

  // Rows
  for (let i = 0; i < indicators.length; i++) {
    const ind = indicators[i];
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";

    doc.rect(colX[0], y, doc.page.width - 100, rowH).fill(bg);
    doc.fillColor("#111827").fontSize(10);

    doc.text(`${i + 1}`, colX[1], y + 5, { width: 40 });
    doc.text(ind.label, colX[2] - 30, y + 5, { width: 160 });
    doc.text(`${(ind.weight * 100).toFixed(0)}%`, colX[3] - 20, y + 5, {
      width: 50,
    });
    doc.fillColor(scoreColour(ind.score));
    doc.text(`${ind.score}`, colX[3] + 40, y + 5, { width: 50 });
    doc.fillColor("#111827");

    y += rowH;
  }

  doc.y = y + 10;
}

function drawDeviationTable(
  doc: PDFKit.PDFDocument,
  deviations: ExportJointDeviation[],
) {
  const colX = [50, 60, 270, 400, 490];
  const rowH = 22;
  let y = doc.y;

  // Header
  doc.fontSize(9).fillColor("#6b7280");
  doc.text("关节", colX[1], y + 6, { width: 100 });
  doc.text("部位", colX[2], y + 6, { width: 100 });
  doc.text("偏差(m)", colX[3], y + 6, { width: 60 });
  doc.text("程度", colX[4] + 10, y + 6, { width: 50 });
  y += rowH;

  const sorted = [...deviations].sort((a, b) => b.deviation - a.deviation);

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";

    doc.rect(colX[0], y, doc.page.width - 100, rowH).fill(bg);
    doc.fillColor("#111827").fontSize(10);

    doc.text(d.jointLabel, colX[1], y + 5, { width: 100 });
    doc.text(d.bodyPart, colX[2], y + 5, { width: 100 });
    doc.text(d.deviation.toFixed(3), colX[3], y + 5, { width: 60 });

    const level = d.deviation > 0.1 ? "严重" : d.deviation > 0.05 ? "中等" : "轻微";
    doc.fillColor(d.deviation > 0.1 ? "#dc2626" : d.deviation > 0.05 ? "#ca8a04" : "#16a34a");
    doc.text(level, colX[4] + 10, y + 5, { width: 50 });
    doc.fillColor("#111827");

    y += rowH;
  }

  doc.y = y + 10;
}

function drawFeedbackItem(
  doc: PDFKit.PDFDocument,
  bodyPart: string,
  issue: string,
  colour: string,
  description: string,
  suggestion: string,
) {
  doc.fontSize(10).fillColor(colour);
  doc.text(`${bodyPart} — ${issue}`, { continued: false });
  doc.moveDown(0.3);

  doc.fontSize(9).fillColor("#374151");
  doc.text(description, { indent: 10 });
  doc.moveDown(0.2);
  doc.text(`建议: ${suggestion}`, { indent: 10 });
}

function drawSuggestion(
  doc: PDFKit.PDFDocument,
  area: string,
  colour: string,
  suggestion: string,
  exercises: { name: string; description: string }[],
) {
  doc.fontSize(10).fillColor(colour);
  doc.text(area, { continued: false });
  doc.moveDown(0.3);

  doc.fontSize(9).fillColor("#374151");
  doc.text(suggestion, { indent: 10 });

  if (exercises.length > 0) {
    doc.moveDown(0.2);
    for (const ex of exercises) {
      doc.fontSize(9).fillColor("#4b5563");
      doc.text(`• ${ex.name}: ${ex.description}`, { indent: 20 });
    }
  }
}
