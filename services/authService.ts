import { User, WhitelistEntry, TrustedDevice, Role } from '../types';

// ============================================================
// WHITELIST — Dynamic, admin-managed whitelist backed by localStorage.
// Seed entries are written once on first load; admins can add/remove
// entries at runtime via the Identity Governance panel.
// Privilege order for conflict resolution: admin > faculty > canteen > student
// ============================================================

export const PRIVILEGE_ORDER: Record<Role, number> = {
  admin: 4,
  faculty: 3,
  canteen: 2,
  student: 1,
};

const WHITELIST_STORAGE_KEY = 'cw_whitelist';

const SEED_WHITELIST: WhitelistEntry[] = [
  // Students
  { email: 'stu@gmail.com',                          role: 'student', id: 4000, fullName: 'Student User',         department: 'Cyber Security'       },
  { email: 'dbsmita06@gmail.com',                    role: 'student', id: 4001, fullName: 'Debasmita Deb',         department: 'Digital Forensics'    },

  // Faculty
  { email: 'fac@gmail.com',                          role: 'faculty', id: 3000, fullName: 'Faculty Member',        department: 'Forensic Science'     },
  { email: 'dishac981@gmail.com',                    role: 'faculty', id: 3001, fullName: 'Faculty Member 2',      department: 'Forensic Science'     },

  // Canteen
  { email: 'ct@gmail.com',                           role: 'canteen', id: 1000, fullName: 'Canteen Operator',      department: 'Canteen Management'   },
  { email: 'debasmita.btmtcs4242928@nfsu.ac.in',     role: 'canteen', id: 1001, fullName: 'Debasmita NFSU',        department: 'Canteen Management'   },

  // Admin
  { email: 'ad@gmail.com',                           role: 'admin',   id: 2000, fullName: 'System Administrator', department: 'IT Services'          },
  { email: 'debasmitak10@gmail.com',                 role: 'admin',   id: 2001, fullName: 'Debasmita Karmakar',    department: 'Computer Science'     },
];

/** Build a Map from an array, keeping highest-privilege entry per email. */
const buildMap = (entries: WhitelistEntry[]): Map<string, WhitelistEntry> => {
  const map = new Map<string, WhitelistEntry>();
  for (const entry of entries) {
    const key = entry.email.toLowerCase();
    const existing = map.get(key);
    if (!existing || PRIVILEGE_ORDER[entry.role] > PRIVILEGE_ORDER[existing.role]) {
      map.set(key, entry);
    }
  }
  return map;
};

/** Load all whitelist entries from localStorage, always merging seed entries so
 *  hardcoded additions appear on existing installs without wiping user-added data. */
const loadEntries = (): WhitelistEntry[] => {
  let stored: WhitelistEntry[] = [];
  try {
    const raw = localStorage.getItem(WHITELIST_STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as WhitelistEntry[];
  } catch { /* ignore */ }

  // Merge: add any seed entry whose email+role combo is missing from stored
  let changed = false;
  for (const seed of SEED_WHITELIST) {
    const exists = stored.some(
      e => e.email.toLowerCase() === seed.email.toLowerCase() && e.role === seed.role
    );
    if (!exists) {
      stored.push(seed);
      changed = true;
    }
  }

  if (changed || stored.length === 0) {
    localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(stored));
  }

  return stored.length > 0 ? stored : SEED_WHITELIST;
};

const saveEntries = (entries: WhitelistEntry[]): void => {
  localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent('cw_whitelist_update'));
};

/** Returns the live whitelist Map (re-reads from storage each call). */
export const getWhitelistMap = (): Map<string, WhitelistEntry> =>
  buildMap(loadEntries());

/** Backwards-compatible export — snapshot at module load time. */
export const WHITELIST: Map<string, WhitelistEntry> = buildMap(loadEntries());

// ============================================================
// ADMIN-ONLY WHITELIST MUTATIONS
// ============================================================

export interface WhitelistMutationResult {
  success: boolean;
  error?: string;
}

/** Add a new entry (admin-only gate is enforced in the UI layer). */
export const addWhitelistEntry = (entry: WhitelistEntry): WhitelistMutationResult => {
  const entries = loadEntries();
  const key = entry.email.toLowerCase();
  // Prevent duplicate email+role combos
  if (entries.some(e => e.email.toLowerCase() === key && e.role === entry.role)) {
    return { success: false, error: 'This email + role combination already exists.' };
  }
  // Auto-assign next ID in role bucket if id === 0
  let newEntry = { ...entry, email: key };
  if (!newEntry.id) {
    const maxId = entries
      .filter(e => e.role === entry.role)
      .reduce((m, e) => Math.max(m, e.id), 0);
    newEntry.id = maxId + 1;
  }
  saveEntries([...entries, newEntry]);
  // Keep module-level WHITELIST in sync
  WHITELIST.set(key, newEntry);
  return { success: true };
};

/** Remove an entry by email + role. */
export const removeWhitelistEntry = (email: string, role: Role): WhitelistMutationResult => {
  const key = email.toLowerCase();
  const entries = loadEntries();
  const next = entries.filter(e => !(e.email.toLowerCase() === key && e.role === role));
  if (next.length === entries.length) {
    return { success: false, error: 'Entry not found.' };
  }
  saveEntries(next);
  // If no remaining entries for this email, remove from map
  if (!next.some(e => e.email.toLowerCase() === key)) {
    WHITELIST.delete(key);
  } else {
    // Re-resolve highest privilege for this email
    const remaining = next.filter(e => e.email.toLowerCase() === key);
    const best = remaining.reduce((a, b) =>
      PRIVILEGE_ORDER[a.role] >= PRIVILEGE_ORDER[b.role] ? a : b
    );
    WHITELIST.set(key, best);
  }
  return { success: true };
};

/** Get live list of all whitelist entries (re-reads storage). */
export const getWhitelistEntries = (): WhitelistEntry[] => loadEntries();

// ============================================================
// DEVICE TRUST
// ============================================================

const TRUST_VALIDITY_MS: Record<Role, number> = {
  admin:   7  * 24 * 60 * 60 * 1000,
  faculty: 14 * 24 * 60 * 60 * 1000,
  canteen: 30 * 24 * 60 * 60 * 1000,
  student: 30 * 24 * 60 * 60 * 1000,
};

const DEVICE_TRUST_KEY = 'cw_device_trust';

const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem('cw_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('cw_device_id', id);
  }
  return id;
};

const loadTrustedDevices = (): TrustedDevice[] => {
  try {
    const raw = localStorage.getItem(DEVICE_TRUST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveTrustedDevices = (devices: TrustedDevice[]): void => {
  localStorage.setItem(DEVICE_TRUST_KEY, JSON.stringify(devices));
};

export const isDeviceTrusted = (email: string, role: Role): boolean => {
  const deviceId = getOrCreateDeviceId();
  const devices = loadTrustedDevices();
  const now = Date.now();
  const record = devices.find(
    d => d.deviceId === deviceId && d.email.toLowerCase() === email.toLowerCase()
  );
  if (!record) return false;
  if (record.expiresAt < now) return false;
  if (record.role !== role) return false; // role change invalidates trust
  return true;
};

export const trustCurrentDevice = (email: string, role: Role): void => {
  const deviceId = getOrCreateDeviceId();
  const devices = loadTrustedDevices().filter(
    d => !(d.deviceId === deviceId && d.email.toLowerCase() === email.toLowerCase())
  );
  const validityMs = TRUST_VALIDITY_MS[role];
  const now = Date.now();
  devices.push({ deviceId, email: email.toLowerCase(), role, trustedAt: now, expiresAt: now + validityMs });
  saveTrustedDevices(devices);
};

export const revokeDeviceTrust = (email: string): void => {
  const devices = loadTrustedDevices().filter(
    d => d.email.toLowerCase() !== email.toLowerCase()
  );
  saveTrustedDevices(devices);
};

// ============================================================
// TOTP — development-only fixed code. Production requires a real OTP provider.
// ============================================================

const TOTP_PAYLOAD_KEY = 'cw_totp_payload';
const TOTP_WINDOW_MS   = 5 * 60 * 1000; // 5 minutes

interface TOTPPayload {
  generatedAt: number;
  email: string;       // lower-cased, for binding
}

export interface TOTPSendResult {
  success: boolean;
  error?: string;
  /** Present only in development, where OTP delivery is simulated locally. */
  developmentCode?: string;
}

/**
 * Generates a browser-only demo OTP challenge for the static, local-first app.
 * The app has no backend or email service, so the code is intentionally local and
 * displayed to the user in-browser to keep the experience functional in demo and
 * deployable static builds.
 */
const DEMO_TOTP_CODE = '098765';

export const generateAndSendTOTP = async (email: string): Promise<TOTPSendResult> => {
  clearTOTPSession();

  const payload: TOTPPayload = {
    generatedAt: Date.now(),
    email: email.toLowerCase(),
  };
  sessionStorage.setItem(TOTP_PAYLOAD_KEY, JSON.stringify(payload));

  return { success: true, developmentCode: DEMO_TOTP_CODE };
};

/**
 * Validates the local demo code against the active, email-bound challenge.
 */
export const validateTOTP = async (inputCode: string, email: string): Promise<boolean> => {
  try {
    const raw = sessionStorage.getItem(TOTP_PAYLOAD_KEY);
    if (!raw) return false;

    const payload: TOTPPayload = JSON.parse(raw);

    if (payload.email !== email.toLowerCase()) return false;
    if (Date.now() - payload.generatedAt > TOTP_WINDOW_MS) return false;
    if (inputCode.trim() !== DEMO_TOTP_CODE) return false;

    // Consume the payload — strictly one-time use
    sessionStorage.removeItem(TOTP_PAYLOAD_KEY);
    return true;
  } catch {
    return false;
  }
};

export const clearTOTPSession = (): void => {
  sessionStorage.removeItem(TOTP_PAYLOAD_KEY);
};

// ============================================================
// GOOGLE OAUTH SIMULATION
// In production this uses the Google Identity Services SDK.
// ============================================================

export interface GoogleAuthResult {
  email: string;
  verified: boolean;
}

export const simulateGoogleOAuth = async (email: string): Promise<GoogleAuthResult> => {
  await new Promise(r => setTimeout(r, 1200));
  return { email: email.trim().toLowerCase(), verified: true };
};

// ============================================================
// WHITELIST HELPERS
// ============================================================

export const lookupWhitelist = (email: string): WhitelistEntry | null =>
  getWhitelistMap().get(email.trim().toLowerCase()) ?? null;

export const buildUserFromEntry = (entry: WhitelistEntry): User => ({
  id:         String(entry.id),
  numericId:  entry.id,
  email:      entry.email,
  fullName:   entry.fullName,
  department: entry.department,
  role:       entry.role,
  status:     'Active',
  createdAt:  Date.now(),
  lastLogin:  Date.now(),
});