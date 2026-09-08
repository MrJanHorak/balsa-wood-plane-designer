import { DEFAULT_GLIDER, GLIDER_PRESETS } from '../constants/presets';
import { analyzeGliderStability } from './stability';

console.log('--- TESTING BALSA GLIDER PHYSICS ENGINE ---');

for (const [key, preset] of Object.entries(GLIDER_PRESETS)) {
  console.log(`\nTesting Preset: ${preset.name} (${key})`);
  const report = analyzeGliderStability(preset);
  console.log(`- Total Weight: ${report.massBreakdown.totalGrams}g (Fuselage: ${report.massBreakdown.fuselageGrams}g, Wing: ${report.massBreakdown.wingGrams}g, Tail: ${report.massBreakdown.tailGrams}g, Ballast: ${report.massBreakdown.ballastGrams}g)`);
  console.log(`- Wing Area: ${report.wingAreaDm2} dm² | Wing Loading: ${report.wingLoadingGDm2} g/dm² (${report.wingLoadingOzSqFt} oz/sq.ft)`);
  console.log(`- MAC: ${report.meanAerodynamicChordMm} mm | Wing AC: ${report.wingAcXMm} mm | Tail AC: ${report.tailAcXMm} mm`);
  console.log(`- CG: ${report.cgXMm} mm | NP: ${report.npXMm} mm`);
  console.log(`- Static Margin: ${report.staticMarginPercent}% | Status: ${report.stabilityStatus} (${report.statusBadgeText})`);
  console.log(`- Recommended Ballast: ${report.recommendedBallastGrams}g (Current: ${preset.fuselage.noseBallastGrams}g)`);
}
