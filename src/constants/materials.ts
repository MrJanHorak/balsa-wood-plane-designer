import { BalsaMaterial } from '@/types/glider';

export const BALSA_MATERIALS: Record<string, BalsaMaterial> = {
  LIGHT_CONTEST: {
    id: 'light_contest',
    name: 'Contest Grade Balsa (6 lb/cu.ft)',
    densityKgM3: 96,
    sheetThicknessMm: 1.5875, // 1/16"
    laserKerfMm: 0.12,
    grainOrientation: 'spanwise',
  },
  MEDIUM_STANDARD: {
    id: 'medium_standard',
    name: 'Standard Hobby Balsa (8 lb/cu.ft)',
    densityKgM3: 128,
    sheetThicknessMm: 1.5875, // 1/16"
    laserKerfMm: 0.14,
    grainOrientation: 'spanwise',
  },
  HEAVY_STRUCTURAL: {
    id: 'heavy_structural',
    name: 'Hard Structural Balsa (11 lb/cu.ft)',
    densityKgM3: 176,
    sheetThicknessMm: 3.175,  // 1/8"
    laserKerfMm: 0.16,
    grainOrientation: 'spanwise',
  },
};

export const STANDARD_SHEET_SIZES = [
  { name: '3" x 36" (76mm x 914mm)', widthMm: 76.2, lengthMm: 914.4 },
  { name: '4" x 36" (100mm x 914mm)', widthMm: 101.6, lengthMm: 914.4 },
  { name: 'A4 Balsa Plate (210mm x 297mm)', widthMm: 210, lengthMm: 297 },
];
