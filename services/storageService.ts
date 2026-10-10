// services/storageService.ts
//
// Handles ALL file uploads to Firebase Storage.
// Supports: images (jpg/png/gif/webp), PDFs, and any other file type.
// Returns a public download URL after upload.

import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from 'firebase/storage';
import { storage } from '../firebaseConfig';

export type StorageFolder =
  | 'profile_photos'     // User profile pictures
  | 'lostfound_images'   // Lost & Found item photos / handover proofs
  | 'opportunity_docs'   // Opportunity attachment PDFs
  | 'resource_papers'    // Question papers / notes PDFs
  | 'skill_proofs'       // Skill-offer proficiency PDFs
  | 'microhelp_docs'     // Micro-help task documents
  | 'noticeboard'        // Notice attachments
  | 'canteen'            // Canteen-related files
  | 'misc';              // Everything else

// ─────────────────────────────────────────────
// Upload a raw File object (from <input type="file">)
// ─────────────────────────────────────────────
export const uploadFile = async (
  folder: StorageFolder,
  file: File,
  customFileName?: string
): Promise<string> => {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fileName = customFileName
    ? `${customFileName}.${ext}`
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const metadata: UploadMetadata = { contentType: file.type };
  const storageRef = ref(storage, `${folder}/${fileName}`);

  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
};

// ─────────────────────────────────────────────
// Upload a base64 data-URL string
// (used by components that already read files as base64)
// ─────────────────────────────────────────────
export const uploadBase64 = async (
  folder: StorageFolder,
  base64DataUrl: string,
  mimeType: string,
  customFileName?: string
): Promise<string> => {
  const ext = mimeType.split('/')[1] ?? 'bin';
  const fileName = customFileName
    ? `${customFileName}.${ext}`
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const storageRef = ref(storage, `${folder}/${fileName}`);
  await uploadString(storageRef, base64DataUrl, 'data_url', { contentType: mimeType });
  return getDownloadURL(storageRef);
};

// ─────────────────────────────────────────────
// Delete a file by its full download URL
// ─────────────────────────────────────────────
export const deleteFileByUrl = async (downloadUrl: string): Promise<void> => {
  try {
    const storageRef = ref(storage, downloadUrl);
    await deleteObject(storageRef);
  } catch (err) {
    // Silently ignore — file may already be gone
    console.warn('[storageService] deleteFileByUrl failed:', err);
  }
};

// ─────────────────────────────────────────────
// Helper: detect if a string is a base64 data-URL
// ─────────────────────────────────────────────
export const isBase64DataUrl = (value: string): boolean =>
  typeof value === 'string' && value.startsWith('data:');

// ─────────────────────────────────────────────
// Helper: auto-upload if value is base64, else pass through
// Useful when migrating fields that stored base64 locally
// ─────────────────────────────────────────────
export const ensureUploaded = async (
  folder: StorageFolder,
  value: string | undefined
): Promise<string | undefined> => {
  if (!value) return undefined;
  if (isBase64DataUrl(value)) {
    const mime = value.split(';')[0].split(':')[1];
    return uploadBase64(folder, value, mime);
  }
  return value; // Already a URL
};
