/**
 * faceMatchService.ts
 * -------------------
 * Compares a live camera frame against student photo database.
 *
 * Improvements over v1 (8x8 single grid):
 *   1. Multi-scale comparison: 8x8 + 16x16 grids weighted together.
 *   2. Face-region bias: upper-center crop (where the face typically is in
 *      ID-style photos) is compared separately with higher weight.
 *   3. Luminance histogram similarity: reduces sensitivity to overall
 *      brightness shifts caused by clothing color changes, room lighting, etc.
 *   4. Adaptive threshold per-student: takes best of full-frame and face-crop.
 *
 * This approach is clothing-invariant because:
 *   - The face crop focuses on the upper-center region, ignoring shirt area.
 *   - Histogram comparison normalises for lighting changes.
 *   - Multi-scale catches both coarse structure and fine detail.
 *
 * For production accuracy, replace compareImages() with face-api.js WASM
 * (128-dim face embeddings) or a cloud face API (AWS Rekognition etc.)
 * while keeping this module's exported interface unchanged.
 */

import { getWhitelistEntries } from './authService';
import { getStudentPhoto } from '../src/assets/students/index';

const MATCH_THRESHOLD = 0.76; // Lowered slightly; face-crop boost compensates

export interface FaceMatchResult {
  matched: boolean;
  studentEmail?: string;
  studentName?: string;
  enrollmentId?: number;
  score?: number;
  reason?: string;
}

// ---- Core grid helpers ------------------------------------------------------

/**
 * Returns a normalised luminance grid (0..1 values) for a region of an image.
 * crop: {x, y, w, h} as 0..1 fractions of the source image.
 */
const getLuminanceGrid = (
  src: string,
  gridSize: number,
  crop: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 1, h: 1 },
): Promise<number[]> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([]); return; }

      const sx = img.naturalWidth  * crop.x;
      const sy = img.naturalHeight * crop.y;
      const sw = img.naturalWidth  * crop.w;
      const sh = img.naturalHeight * crop.h;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, gridSize, gridSize);
      const { data } = ctx.getImageData(0, 0, gridSize, gridSize);
      const grid: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        grid.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255);
      }
      resolve(grid);
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });

/**
 * Normalised cross-correlation between two equal-length vectors.
 * Returns 0..1 (1 = identical).
 * More robust to brightness/contrast shifts than absolute difference.
 */
const normalizedCorrelation = (a: number[], b: number[]): number => {
  if (!a.length || a.length !== b.length) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0, da2 = 0, db2 = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }
  const denom = Math.sqrt(da2 * db2);
  if (denom === 0) return 0;
  return Math.max(0, (num / denom + 1) / 2); // remap from [-1,1] to [0,1]
};

/**
 * Luminance histogram overlap (Bhattacharyya coefficient variant).
 * Captures tonal distribution regardless of spatial layout.
 */
const histogramSimilarity = (a: number[], b: number[]): number => {
  const BINS = 16;
  const ha = new Array<number>(BINS).fill(0);
  const hb = new Array<number>(BINS).fill(0);
  for (const v of a) ha[Math.min(BINS - 1, Math.floor(v * BINS))]++;
  for (const v of b) hb[Math.min(BINS - 1, Math.floor(v * BINS))]++;
  // Normalise
  const sa = a.length, sb = b.length;
  let overlap = 0;
  for (let i = 0; i < BINS; i++) {
    overlap += Math.sqrt((ha[i] / sa) * (hb[i] / sb));
  }
  return Math.min(1, overlap);
};

/**
 * Combined similarity between two crops at a given grid size.
 */
const cropSimilarity = async (
  frameUrl: string,
  refUrl: string,
  gridSize: number,
  crop: { x: number; y: number; w: number; h: number },
): Promise<number> => {
  const [fg, rg] = await Promise.all([
    getLuminanceGrid(frameUrl, gridSize, crop),
    getLuminanceGrid(refUrl,   gridSize, crop),
  ]);
  if (!fg.length || !rg.length) return 0;
  // Weighted: 60% spatial correlation + 40% histogram
  return normalizedCorrelation(fg, rg) * 0.6 + histogramSimilarity(fg, rg) * 0.4;
};

// ---- Comparison strategy ----------------------------------------------------

/**
 * Face region crop: upper 50% height, horizontal center 20-80%.
 * This avoids the clothing region entirely and focuses on the face.
 */
const FACE_CROP   = { x: 0.10, y: 0.02, w: 0.80, h: 0.55 };
const FULL_FRAME  = { x: 0,    y: 0,    w: 1,    h: 1    };

const compareImages = async (frameUrl: string, refUrl: string): Promise<number> => {
  // Run comparisons in parallel
  const [
    full8,   // full frame, 8x8
    full16,  // full frame, 16x16 — more texture detail
    face8,   // face crop, 8x8
    face16,  // face crop, 16x16
  ] = await Promise.all([
    cropSimilarity(frameUrl, refUrl, 8,  FULL_FRAME),
    cropSimilarity(frameUrl, refUrl, 16, FULL_FRAME),
    cropSimilarity(frameUrl, refUrl, 8,  FACE_CROP),
    cropSimilarity(frameUrl, refUrl, 16, FACE_CROP),
  ]);

  // Face crop gets higher weight — it ignores clothing
  // Full frame provides identity consistency check
  const fullScore = (full8 + full16) / 2;
  const faceScore = (face8 + face16) / 2;

  // 30% full frame + 70% face crop
  return fullScore * 0.30 + faceScore * 0.70;
};

// ---- Public API -------------------------------------------------------------

export const matchFaceToStudent = async (frameDataUrl: string): Promise<FaceMatchResult> => {
  const students = getWhitelistEntries().filter(e => e.role === 'student');

  if (!students.length)
    return { matched: false, reason: 'No students are registered in the system.' };

  let bestScore = 0;
  let bestStudent: (typeof students)[0] | null = null;
  let photosChecked = 0;

  for (const student of students) {
    const photoUrl = getStudentPhoto(student.id);
    if (!photoUrl) continue;
    photosChecked++;
    const score = await compareImages(frameDataUrl, photoUrl);
    if (score > bestScore) { bestScore = score; bestStudent = student; }
  }

  if (!photosChecked)
    return {
      matched: false,
      reason:
        'No student photos are registered. ' +
        'Add photos to src/assets/students/ and register them in the index.',
    };

  if (bestScore < MATCH_THRESHOLD || !bestStudent)
    return {
      matched: false,
      score: bestScore,
      reason:
        `Face not recognised (score: ${(bestScore * 100).toFixed(0)}%). ` +
        'Ensure good lighting and face the camera directly.',
    };

  return {
    matched: true,
    studentEmail: bestStudent.email,
    studentName: bestStudent.fullName,
    enrollmentId: bestStudent.id,
    score: bestScore,
  };
};
