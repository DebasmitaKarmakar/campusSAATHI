/**
 * STUDENT PHOTO DATABASE
 * ======================
 * Place each student photo in this folder, named after their numeric
 * enrollment ID.
 *
 * Naming convention:   <numericId>.<ext>
 * Supported formats:   .jpg  .jpeg  .png  .webp
 *
 * Examples:
 *   src/assets/students/4000.jpg   -> Student User      (id 4000)
 *   src/assets/students/4001.jpg   -> Debasmita Deb     (id 4001)
 *
 * To register a new student photo:
 *   1. Drop the photo into this folder using the naming convention above.
 *   2. Uncomment (or add) the import line below.
 *   3. Add the mapping into STUDENT_PHOTOS.
 *   4. Save — Vite hot-reloads automatically.
 *
 * Photos are bundled at build time. Nothing is stored in localStorage.
 * The face-match engine reads STUDENT_PHOTOS at runtime.
 *
 * Photo guidelines:
 *   - Minimum 200x200 px
 *   - Front-facing, eyes visible
 *   - Even lighting, no harsh shadows across the face
 *   - One face per image
 *   - No sunglasses or head coverings that obscure facial features
 */

// ---------------------------------------------------------------------------
// Import photos here — one line per student.
// Comment out any student whose photo is not yet available.
// ---------------------------------------------------------------------------

import s4001 from './4001.jpeg';


// ---------------------------------------------------------------------------
// Map: numeric enrollment ID -> imported photo URL
// ---------------------------------------------------------------------------

export const STUDENT_PHOTOS: Record<number, string> = {
4001: s4001,
};

/** Returns the registered photo URL for a given enrollment ID, or null. */
export const getStudentPhoto = (enrollmentId: number): string | null =>
  STUDENT_PHOTOS[enrollmentId] ?? null;
