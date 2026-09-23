import { jsPDF } from 'jspdf';
import { GliderDesign } from '@/types/glider';
import { getPrintParts, getPartTiles, getRegistrationMarks, printPoint, readPatternPath, PRINT_MARGIN, PRINT_TOP, PRINT_OVERLAP, PRINT_PAPER, PrintPaper } from './printLayout';
import { getWingBlank } from './wingBlank';
import { getWingFormingTargets } from './wingForming';
import { validateGliderDesign } from './validation';

// Built-in PDF fonts have limited Unicode coverage. Keep arbitrary design names
// legible without silently inserting missing-glyph boxes in print instructions.
const text = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '-');

export function createPatternPdf(g: GliderDesign, paper: PrintPaper = 'a4'): jsPDF {
  const page = PRINT_PAPER[paper];
  const parts = getPrintParts(g);
  const layouts = parts.map(item => getPartTiles(item, paper));
  const totalTiles = layouts.reduce((n, layout) => n + layout.tiles.length, 0);
  if (totalTiles > 150) throw new Error('This design needs more than 150 pattern pages. Reduce its dimensions before printing.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: paper, compress: true, precision: 5 });
  const title = text(g.name).slice(0, 80);
  doc.setProperties({ title: `${title} - full-size patterns`, subject: 'Print at 100% actual size; verify the calibration box.', creator: 'BalsaPlaneDesigner' });
  let y = 16;
  const block = (value: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(text(value), page.width - 28);
    for (const line of lines) {
      if (y > page.height - 32) { doc.addPage(); y = 16; }
      doc.text(line, 14, y); y += size * 0.45 + 1;
    }
    y += 2;
  };
  block(title, 17, true);
  block(`${paper.toUpperCase()} landscape | ${totalTiles} pattern tiles | 1 PDF unit = 1 mm`, 10);
  block('Print and assemble the paper templates', 12, true);
  block('1. Select Actual size / 100%. Disable Fit, Shrink, borderless enlargement and duplex printing. Measure the calibration box: 50 mm wide and 10 mm tall. Do not cut if either measurement is wrong.');
  block(`2. Keep each part's tiles together. Rows run top to bottom; columns run left to right. Adjacent tiles repeat ${PRINT_OVERLAP} mm of geometry. Trim one sheet within the overlap, align the matching crosshairs and repeated outlines, then tape.`);
  block('3. Solid dark lines are cuts. Dashed blue lines are fold / score / glue-seat guides, not through-cuts. Gray crosses and borders are paper alignment marks. This is not a balsa stock nesting plan.');
  block('Part list (use the thickness specified for each part)', 12, true);
  parts.forEach((item, i) => block(`${item.part.name}: ${item.thickness.toFixed(3)} mm sheet; ${layouts[i].rows} row(s) x ${layouts[i].columns} column(s).`, 9));
  block('Build notes', 12, true);
  block(getWingBlank(g.wing).description, 9);
  const forming = getWingFormingTargets(g.wing);
  if (g.wing.dihedralDeg > 0) block(`Main wing: form ${g.wing.dihedralDeg.toFixed(1)} degrees upward on EACH half. With the center held level, each tip should rise about ${forming.tipRiseMm.toFixed(1)} mm. Pulling the blank straight through the slot leaves it flat; the center guide does not bend it automatically. Do not cut through the guide. If forming cracks the wood, use a flat-wing design or revise the joint.`, 9);
  if (g.wing.camberPercent > 0) block(`Root chord: the intended ${g.wing.camberPercent.toFixed(1)}% camber has about ${forming.rootCamberRiseMm.toFixed(1)} mm maximum rise near 40% chord. The flat blank must be formed to reach this shape; check both halves for similar curvature.`, 9);
  block('Dry-fit the wing and tail, and trial the wing-forming and insertion sequence on scrap. Through-slots include clearance for the final assembled wing, but insertion paths and wood bending are not simulated. Do not force a bent wing through a tight slot; revise the joint or choose a flat-wing design if needed. A separate fin or pylon needs a glue joint. Verify physical balance before a gentle test launch.', 9);
  block('Dimensions are nominal. Cutting-tool kerf is not applied. Use measured stock thickness and test the fit. Glue, finish and actual wood density can change the mass and balance.', 9);
  const report = validateGliderDesign(g);
  if (report.errors.length || report.warnings.length) {
    block('Current design checks - review before building', 12, true);
    for (const issue of [...report.errors, ...report.warnings]) block(`${issue.severity.toUpperCase()}: ${issue.title}. ${issue.message}`, 9);
  }

  parts.forEach((item, index) => {
    const layout = layouts[index];
    for (const tile of layout.tiles) {
      doc.addPage();
      doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`${text(item.part.name)} | R${tile.row + 1} C${tile.column + 1} of ${layout.rows} x ${layout.columns}`, 12, 13);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(`${title.slice(0, 65)} | ${item.thickness.toFixed(3)} mm stock | Print 100% | ${PRINT_OVERLAP} mm overlap`, 12, 20);
      doc.setFontSize(8);
      doc.text('Solid: cut   Dashed blue: guide   Gray: paper registration (do not cut wood on gray marks)', 12, 26);
      doc.saveGraphicsState();
      doc.rect(PRINT_MARGIN, PRINT_TOP, layout.width, layout.height, null);
      doc.clip(); doc.discardPath();
      const drawPath = (path: string) => {
        for (const segment of readPatternPath(path)) {
          segment.points.forEach((point, i) => {
            const p = printPoint(point, item);
            const x = PRINT_MARGIN + p.x - tile.x, y = PRINT_TOP + p.y - tile.y;
            if (i === 0) doc.moveTo(x, y); else doc.lineTo(x, y);
          });
          if (segment.closed) doc.close();
          doc.stroke();
        }
      };
      doc.setDrawColor(20); doc.setLineWidth(0.18); doc.setLineDashPattern([], 0);
      [item.part.outlinePath, ...item.part.slotCutouts].forEach(drawPath);
      doc.setDrawColor(20, 90, 170); doc.setLineDashPattern([2, 1], 0);
      item.part.scoreLines.forEach(drawPath);
      doc.setDrawColor(145); doc.setLineWidth(0.15); doc.setLineDashPattern([], 0);
      const cross = (x: number, y: number) => {
        const px = PRINT_MARGIN + x - tile.x, py = PRINT_TOP + y - tile.y;
        doc.line(px - 2, py, px + 2, py); doc.line(px, py - 2, px, py + 2);
      };
      // Registration marks use part-global coordinates: the same mark appears
      // on both pages in each overlap, unlike page-corner crop marks.
      for (const p of getRegistrationMarks(layout)) {
        if (p.x >= tile.x && p.x <= tile.x + layout.width && p.y >= tile.y && p.y <= tile.y + layout.height) cross(p.x, p.y);
      }
      doc.restoreGraphicsState();
      doc.setDrawColor(190); doc.setLineWidth(0.15); doc.setLineDashPattern([], 0);
      doc.rect(PRINT_MARGIN, PRINT_TOP, layout.width, layout.height);
    }
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setTextColor(30); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`BalsaPlaneDesigner | ${i} / ${pages} | ${paper.toUpperCase()} | Actual size 100%`, 12, page.height - 9);
    doc.setDrawColor(20); doc.setLineWidth(0.15); doc.setLineDashPattern([], 0);
    doc.rect(page.width - 72, page.height - 19, 50, 10);
    doc.text('Calibration: 50 mm x 10 mm', page.width - 72, page.height - 21);
  }
  return doc;
}
