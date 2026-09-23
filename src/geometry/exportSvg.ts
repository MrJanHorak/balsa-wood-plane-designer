import { GliderDesign } from '@/types/glider';
import { generateFinFlatPattern, generateFuselageFlatPattern, generatePylonFlatPattern, generateTailFlatPattern, generateWingFlatPattern } from './patterns2d';

const escapeXml = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));

/** Manufacturing geometry only. No preview backgrounds, labels or rulers become
 * accidental toolpaths. One SVG user unit is one physical millimetre. */
export function exportPatternSvg(glider: GliderDesign): string {
  const parts = [
    { part: generateFuselageFlatPattern(glider), rotate: false, thickness: glider.fuselage.thicknessMm },
    { part: generateWingFlatPattern(glider), rotate: true, thickness: glider.wing.thicknessMm },
    { part: generateTailFlatPattern(glider), rotate: true, thickness: glider.horizontalStabilizer.thicknessMm },
    ...(glider.fuselage.mountType === 'parasol_pylon' ? [{ part: generatePylonFlatPattern(glider), rotate: false, thickness: glider.fuselage.thicknessMm }] : []),
    ...(!glider.verticalStabilizer.isIntegralWithFuselage ? [{ part: generateFinFlatPattern(glider), rotate: false, thickness: glider.verticalStabilizer.thicknessMm }] : []),
  ];
  const cuts: string[] = [], guides: string[] = [];
  let y = 10, width = 0;
  for (const { part, rotate, thickness } of parts) {
    const b = part.boundingBox;
    const w = rotate ? b.maxY - b.minY : b.maxX - b.minX;
    const h = rotate ? b.maxX - b.minX : b.maxY - b.minY;
    const transform = rotate
      ? `translate(${10 + b.maxY} ${y - b.minX}) rotate(90)`
      : `translate(${10 - b.minX} ${y + b.maxY}) scale(1 -1)`;
    const paths = [part.outlinePath, ...part.slotCutouts].map(d => `<path d="${escapeXml(d)}"/>`).join('');
    cuts.push(`<g id="cut-${part.id}" data-thickness-mm="${thickness}" transform="${transform}"><title>${escapeXml(part.name)}</title>${paths}</g>`);
    if (part.scoreLines.length) guides.push(`<g id="guide-${part.id}" transform="${transform}">${part.scoreLines.map(d => `<path d="${escapeXml(d)}"/>`).join('')}</g>`);
    width = Math.max(width, w);
    y += h + 10;
  }
  const notes = 'Units: mm. Red: cut. Blue: score/fold/glue guides, not through-cuts. Layout is not stock nesting; separate parts by sheet thickness and grain. Nominal geometry; apply tool kerf in CAM and test slot fit.'
    + (glider.wing.camberPercent > 0 ? ' CAMBER: wing is a projected outline, not a developed flat blank. Prototype and adjust before cutting final material.' : '')
    + (glider.wing.dihedralDeg !== 0 ? ' DIHEDRAL: test the center fold and slot fit before assembly.' : '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width + 20}mm" height="${y}mm" viewBox="0 0 ${width + 20} ${y}">
<title>${escapeXml(glider.name)} — cutting templates</title><desc>${escapeXml(notes)}</desc>
<g id="cut" fill="none" stroke="#ff0000" stroke-width="0.1">${cuts.join('\n')}</g>
<g id="score-guides" fill="none" stroke="#0000ff" stroke-width="0.1">${guides.join('\n')}</g>
</svg>`;
}
