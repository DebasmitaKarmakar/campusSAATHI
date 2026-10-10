STUDENT PHOTO FOLDER
====================

This folder holds reference face images for the attendance face-recognition system.

NAMING CONVENTION
-----------------
Name each file after the student's numeric enrollment ID.

    <numericId>.<ext>

Examples
    4000.jpg    Student User
    4001.png    Another Student

Supported formats: .jpg  .jpeg  .png  .webp

HOW TO ADD A STUDENT PHOTO
---------------------------
1. Obtain a clear, front-facing photo of the student.
2. Save it as <numericId>.jpg in this folder.
3. Open index.ts in this folder.
4. Uncomment (or add) the import line:
       import s4000 from './4000.jpg';
5. Add the mapping inside STUDENT_PHOTOS:
       4000: s4000,
6. Save — Vite will hot-reload automatically.

PHOTO QUALITY GUIDELINES
-------------------------
- Minimum resolution: 200x200 px
- Front-facing, both eyes clearly visible
- Even lighting with no harsh shadows across the face
- No sunglasses, masks, or heavy head coverings
- One face per image
- No filters or heavy editing

NOTES
-----
- Photos are bundled at build time (Vite static import).
- Nothing is stored in localStorage or uploaded to any server.
- The face-match engine (services/faceMatchService.ts) reads
  STUDENT_PHOTOS at runtime and compares luminance grids.
- Students without a registered photo cannot be matched.
  They must be added to this folder AND registered in index.ts.
- For production deployments replace the luminance-grid algorithm
  in faceMatchService.ts with face-api.js or a cloud API for
  accuracy in varied lighting conditions.
