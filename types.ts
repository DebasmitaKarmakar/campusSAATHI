export type Role = 'student' | 'admin' | 'faculty' | 'canteen';
export type AccountStatus = 'Active' | 'Disabled';

export interface WhitelistEntry {
  email: string;
  role: Role;
  id: number;
  fullName: string;
  department: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetName: string;
  timestamp: number;
  details?: string;
}

export interface User {
  id: string;
  numericId: number;
  email: string;
  fullName: string;
  department: string;
  role: Role;
  status: AccountStatus;
  createdAt: number;
  preferredName?: string;
  profilePhoto?: string;
  lastLogin: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface TrustedDevice {
  deviceId: string;
  email: string;
  role: Role;
  trustedAt: number;
  expiresAt: number;
}

export type OrgType = 'club' | 'library' | 'committee' | 'cell' | 'service';
export type OrgStatus = 'active' | 'inactive';

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
}

export interface CampusOrg {
  id: string;
  name: string;
  type?: OrgType;
  description?: string;
  website?: string;
  email?: string;
  logo?: string;
  socialLinks?: SocialLinks;
  status?: OrgStatus;
  facultyAdvisor?: string;
}

export interface DirectoryContact {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  ownerEmail: string;
  ownerId?: string;
  status: 'draft' | 'published';
  isSample?: boolean;
  updatedAt: number;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type OrderStatus = 'Pending' | 'Served' | 'Expired' | 'Cancelled';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MealType;
  available: boolean;
  createdBy: string;
}

export interface CanteenConfig {
  isOrderingOpen: Record<MealType, boolean>;
  menu: MenuItem[];
}

export interface Order {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: OrderStatus;
  timestamp: number;
  servedTimestamp?: number;
  cancelReason?: string;
  declineReason?: string;
  type: MealType;
  feedbackSubmitted: boolean;
}

export interface Feedback {
  orderId: string;
  taste: number;
  quantity: number;
  hygiene: number;
}

export type GeneralFeedbackCategory = 'Service Speed' | 'Staff Behavior' | 'Pricing' | 'Hygiene' | 'Other';

export interface GeneralFeedback {
  id: string;
  category: GeneralFeedbackCategory;
  comment: string;
  timestamp: number;
  isAnonymous: boolean;
  reporterEmail?: string;
}

export type LFCategory = 'ID Card' | 'Wallet' | 'Electronics' | 'Documents' | 'Keys' | 'Other';
export type LFStatus = 'Lost' | 'Found' | 'PendingHandover' | 'Collected';
export type LFPostType = 'LostReport' | 'FoundReport';

export interface LFComment {
  id: string;
  userEmail: string;
  text: string;
  timestamp: number;
}

export interface LFItem {
  id: string;
  type: LFPostType;
  category: LFCategory;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  status: LFStatus;
  reporterId: string;
  reporterEmail: string;
  finderId?: string;
  finderEmail?: string;
  claimantId?: string;
  claimantEmail?: string;
  itemImage?: string;
  handoverImage?: string;
  createdAt: number;
  isSensitive: boolean;
  comments: LFComment[];
}

export type OpportunityStatus = 'Pending' | 'Active' | 'Expired' | 'Rejected';
export type OpportunityMode = 'Online' | 'Offline' | 'Hybrid';

export interface OpportunityPost {
  id: string;
  title: string;
  mode: OpportunityMode;
  deadline: string;
  description?: string;
  documentUrl?: string;
  externalUrl?: string;
  status: OpportunityStatus;
  posterId: string;
  posterEmail: string;
  posterRole: Role;
  createdAt: number;
}

export type ExamType = 'End-Sem' | 'Mid-Sem' | 'CA1' | 'CA2';
export type ResourceCategory = 'Paper' | 'Notes';

export interface QuestionPaper {
  id: string;
  year: string;
  semester: string;
  /** Human-readable exam name for new records; absent on legacy records. */
  examName?: string;
  examType?: ExamType;
  subject: string;
  branch: string;
  /** URL for new records. Kept separate from pdfUrl to preserve legacy Base64 PDFs safely. */
  documentUrl?: string;
  /** Legacy field: existing records may contain a PDF data URL or older document URL. */
  pdfUrl?: string;
  /** Generated from the metadata for new records; absent on legacy records. */
  canonicalName?: string;
  uploaderId: string;
  uploaderEmail: string;
  uploaderName: string;
  resourceType: ResourceCategory;
  /** Legacy metadata only; new linked records do not claim a content hash. */
  fileHash?: string;
  createdAt: number;
  isArchived: boolean;
}

export type HelpCategory = 'Academic' | 'Skill-based';
export type SessionType = 'Individual' | 'Group';
export type HelpRequestStatus = 'Open' | 'Matched' | 'Scheduled' | 'Completed' | 'Archived';

export interface HelpRequest {
  id: string;
  requesterEmail: string;
  topic: string;
  category: HelpCategory;
  sessionType: SessionType;
  description?: string;
  preferredTime?: string;
  preferredPlace?: string;
  status: HelpRequestStatus;
  helperEmail?: string;
  helperSessionType?: SessionType;
  createdAt: number;
}

export interface SkillOffer {
  id: string;
  expertEmail: string;
  subject: string;
  category: HelpCategory;
  description: string;
  proficiencyPdfUrl: string;
  createdAt: number;
}

export type NoticeAudience = 'all' | 'student' | 'faculty';
export type NoticePriority = 'Normal' | 'Important' | 'Urgent';

export interface Notice {
  id: string;
  title: string;
  body: string;
  publishedBy: string;
  publisherEmail: string;
  publisherRole: Role;
  audience: NoticeAudience;
  priority: NoticePriority;
  attachmentUrl?: string;
  createdAt: number;
  isArchived: boolean;
}

export type NotificationCategory =
  | 'food_served'
  | 'new_notice'
  | 'event_declared'
  | 'lostfound_action'
  | 'skill_help_request'
  | 'grievance_reported'
  | 'opportunity_deadline';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  recipientEmail: string;
  isRead: boolean;
  createdAt: number;
  refId?: string;
}

export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface VerificationRequest {
  id: string;
  type: 'event' | 'coordinator' | 'notice' | 'org_detail' | 'flagged_content';
  targetId: string;
  targetName: string;
  requestedBy: string;
  requestedAt: number;
  facultyId?: string;
  status: VerificationStatus;
  comment?: string;
  reviewedAt?: number;
}

// ---------------------------------------------------------------------------
// Micro-Help Module
// ---------------------------------------------------------------------------

export type MicroHelpCategory =
  | 'Academics'
  | 'Coding'
  | 'Design'
  | 'Research'
  | 'Language'
  | 'Career'
  | 'Other';

export type MicroHelpPostStatus =
  | 'PendingReview'
  | 'Open'
  | 'InProgress'
  | 'Resolved'
  | 'Archived'
  | 'Closed';

export interface MicroHelpPost {
  id: string;
  authorEmail: string;
  authorName: string;
  authorRole: Role;
  title: string;
  description: string;
  category: MicroHelpCategory;
  status: MicroHelpPostStatus;
  helperEmail?: string;
  helperName?: string;
  createdAt: number;
  resolvedAt?: number;
  isAnonymous: boolean;
  // extended fields
  contactInfo?: string;
  paymentQrUrl?: string;    // base64 image
  documentUrl?: string;     // base64 file
  documentName?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: number;
}

export type MicroHelpOfferStatus = 'Pending' | 'Accepted' | 'Declined';

export interface MicroHelpOffer {
  id: string;
  postId: string;
  offerEmail: string;
  offerName: string;
  message: string;
  status: MicroHelpOfferStatus;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Attendance Module
// ---------------------------------------------------------------------------

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface TimetableSlot {
  id: string;
  branch: string;
  semester: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  facultyEmail: string;
  facultyName: string;
  classOrder: number;
  isActive: boolean;
  createdAt: number;
}

export type SessionStatus = 'Scheduled' | 'Live' | 'Closed' | 'Cancelled';

export interface AttendanceSession {
  id: string;
  slotId: string;
  date: string;
  branch: string;
  semester: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  facultyEmail: string;
  facultyName: string;
  status: SessionStatus;
  openedAt?: number;
  closedAt?: number;
  isExtra?: boolean;
  rescheduledFrom?: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  slotId: string;
  studentEmail: string;
  studentName: string;
  enrollmentNo: string;
  markedAt: number;
  date: string;
  subjectName: string;
  subjectCode: string;
  branch: string;
  semester: string;
}

export interface ClassReschedule {
  id: string;
  slotId: string;
  requestedBy: string;
  type: 'Reschedule' | 'Extra';
  originalDate?: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: number;
  createdAt: number;
}

export interface StudentAcademicMeta {
  email: string;
  semester: string;
  branch: string;
  isArchived: boolean;
}