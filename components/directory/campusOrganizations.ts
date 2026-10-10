// campusOrganizations.ts
// Data source for the Campus Directory.
// This file acts as a drop-in replacement for an API endpoint.
// To switch to an API, replace this export with a fetch() call returning the same shape.

export type OrgType = 'Club' | 'Library' | 'Committee' | 'Academic' | 'Technical' | 'Other';

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
}

export interface Organization {
  id: string;
  name: string;
  type?: OrgType;
  description?: string;
  website?: string;
  email?: string;
  logo?: string;
  social?: SocialLinks;
  status?: 'Active' | 'Inactive';
}

// ── Data ──────────────────────────────────────────────────────────────────────
// All fields except `name` are optional. The UI will gracefully handle gaps.

export const organizations: Organization[] = [
  // Technical Bodies
  {
    id: 'org-001',
    name: 'CyberSec & Digital Forensics Cell',
    type: 'Technical',
    description: 'Focuses on cybersecurity research, CTF competitions, digital forensics training, and awareness workshops for the NFSU community.',
    website: 'https://nfsu.ac.in',
    email: 'cybercell@nfsu.ac.in',
    status: 'Active',
    social: { instagram: '#', linkedin: '#' },
  },
  {
    id: 'org-002',
    name: 'AI & Machine Learning Lab',
    type: 'Technical',
    description: 'Student-led lab exploring applied AI, deep learning, NLP, and computer vision with hands-on projects and inter-university collaborations.',
    email: 'ailab@nfsu.ac.in',
    status: 'Active',
    social: { linkedin: '#' },
  },
  {
    id: 'org-003',
    name: 'Blockchain & Crypto Research Group',
    type: 'Technical',
    description: 'Research group studying distributed ledger technologies, smart contracts, and decentralized applications in the context of law enforcement.',
    status: 'Active',
  },
  // Academic Cells
  {
    id: 'org-004',
    name: 'Forensic Science Academic Cell',
    type: 'Academic',
    description: 'Bridges theory and practice in forensic science — organising guest lectures, lab demonstrations, moot courts, and case study discussions.',
    website: 'https://nfsu.ac.in/forensic',
    email: 'fsc@nfsu.ac.in',
    status: 'Active',
    social: { instagram: '#', youtube: '#' },
  },
  {
    id: 'org-005',
    name: 'Law & Criminology Circle',
    type: 'Academic',
    description: 'A peer group for students of criminal law, criminology, and victimology, hosting moots, debates, and policy discussions.',
    email: 'lawcircle@nfsu.ac.in',
    status: 'Active',
  },
  {
    id: 'org-006',
    name: 'Behavioural Sciences Study Group',
    type: 'Academic',
    description: 'Interdisciplinary student group studying criminal psychology, profiling, and behavioural analysis methodologies.',
    status: 'Active',
  },
  // Committees
  {
    id: 'org-007',
    name: 'Internal Complaints Committee (ICC)',
    type: 'Committee',
    description: 'Statutory body ensuring a safe campus environment, handling complaints of sexual harassment under POSH Act 2013.',
    email: 'icc@nfsu.ac.in',
    status: 'Active',
  },
  {
    id: 'org-008',
    name: 'Anti-Ragging Committee',
    type: 'Committee',
    description: 'Ensures zero-tolerance for ragging. Oversees orientation programmes, monitors campus incidents, and conducts periodic awareness drives.',
    email: 'antiragging@nfsu.ac.in',
    website: 'https://antiragging.in',
    status: 'Active',
  },
  {
    id: 'org-009',
    name: 'Student Welfare & Grievance Committee',
    type: 'Committee',
    description: 'Official student welfare body for addressing grievances related to academic, hostel, transportation, and administrative concerns.',
    email: 'studentwelfare@nfsu.ac.in',
    status: 'Active',
  },
  {
    id: 'org-010',
    name: 'Examination Committee',
    type: 'Committee',
    description: 'Oversees conduct of internal and external examinations, result processing, moderation, and redressal of examination-related issues.',
    status: 'Active',
  },
  // Library Services
  {
    id: 'org-011',
    name: 'Central Library — NFSU',
    type: 'Library',
    description: 'Repository of legal, forensic, and technical literature. Provides access to JSTOR, SCC Online, Manupatra, Westlaw, and IEEE databases.',
    website: 'https://nfsu.ac.in/library',
    email: 'library@nfsu.ac.in',
    status: 'Active',
    social: { instagram: '#' },
  },
  {
    id: 'org-012',
    name: 'E-Resources & Digital Archive Cell',
    type: 'Library',
    description: 'Manages the university\'s digital repository, e-journals, institutional theses archive, and Open Access resource curation.',
    email: 'edigital@nfsu.ac.in',
    status: 'Active',
  },
  // Clubs
  {
    id: 'org-013',
    name: 'Photography & Visual Media Club',
    type: 'Club',
    description: 'Campus photography club documenting university life, events, and forensic fieldwork through visual storytelling.',
    email: 'photoclub@nfsu.ac.in',
    social: { instagram: '#' },
    status: 'Active',
  },
  {
    id: 'org-014',
    name: 'Debate & Public Speaking Club',
    type: 'Club',
    description: 'Develops argumentation, advocacy, and oratory skills through competitive debate, extempore, and MUNs.',
    email: 'debateclub@nfsu.ac.in',
    status: 'Active',
    social: { instagram: '#', linkedin: '#' },
  },
  {
    id: 'org-015',
    name: 'Cultural & Arts Committee',
    type: 'Club',
    description: 'Organises Rangmanch — NFSU\'s annual cultural fest — along with semester-end performances, art exhibitions, and literary events.',
    website: 'https://nfsu.ac.in/cultural',
    social: { instagram: '#', youtube: '#' },
    status: 'Active',
  },
  {
    id: 'org-016',
    name: 'Sports & Fitness Council',
    type: 'Club',
    description: 'Coordinates intra and inter-university sports events, fitness programmes, yoga sessions, and athletic meets.',
    email: 'sports@nfsu.ac.in',
    status: 'Active',
  },
  {
    id: 'org-017',
    name: 'NSS Unit — NFSU Chapter',
    type: 'Other',
    description: 'National Service Scheme unit engaging students in community service, blood donation drives, rural camps, and awareness initiatives.',
    email: 'nss@nfsu.ac.in',
    status: 'Active',
  },
  // Minimal data example — only name
  {
    id: 'org-018',
    name: 'Green Campus Initiative',
  },
  // Inactive example
  {
    id: 'org-019',
    name: 'Radio & Podcast Club',
    type: 'Club',
    description: 'Student-run podcast initiative covering campus affairs, crime news analysis, and forensic awareness episodes.',
    status: 'Inactive',
    email: 'radioclub@nfsu.ac.in',
  },
];

// ── Data accessor ─────────────────────────────────────────────────────────────
// Replace this function body with an API call to switch from static to dynamic data.
// The return shape stays identical — the UI never needs to change.

export async function fetchOrganizations(): Promise<Organization[]> {
  // Simulated async (swap with: return fetch('/api/organizations').then(r => r.json()))
  return new Promise((resolve) => setTimeout(() => resolve(organizations), 300));
}
