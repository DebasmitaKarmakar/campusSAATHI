
import { QuestionPaper, HelpRequest, HelpCategory, SessionType, HelpRequestStatus, SkillOffer, ResourceCategory, Role } from '../types';
import { dbService } from './dbService';

const T_PAPERS = 'resources_papers';
const T_HELP = 'resources_help';
const T_SKILL_OFFERS = 'resources_skill_offers';

const normalizeText = (value: string): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const canonicalizeHttpsUrl = (value: string): string | undefined => {
  if (typeof value !== 'string') return undefined;
  if (value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

export const isSafeHttpsResourceUrl = (value: string): boolean =>
  Boolean(canonicalizeHttpsUrl(value));

export const createCanonicalResourceName = (data: {
  year: string;
  semester: string;
  branch: string;
  subject: string;
  examName: string;
}): string => [data.subject, data.semester, data.branch, data.examName, data.year]
  .map(part => normalizeText(part)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, ''))
  .join('_');

export const resourceService = {
  getPapers: (): QuestionPaper[] => dbService.getTable<QuestionPaper>(T_PAPERS),

  uploadResource: (
    user: { id: string, email: string, fullName: string, role: Role },
    data: {
      year: string;
      semester: string;
      examName: string;
      subject: string;
      branch: string;
      documentUrl: string;
      resourceType: ResourceCategory;
    }
  ): { success: boolean, message: string } => {
    if (user.role !== 'admin' && user.role !== 'student') {
      return { success: false, message: 'Your role is not permitted to add academic resources.' };
    }

    const year = normalizeText(data.year);
    const semester = normalizeText(data.semester);
    const examName = normalizeText(data.examName);
    const subject = normalizeText(data.subject);
    const branch = normalizeText(data.branch);
    const documentUrl = canonicalizeHttpsUrl(data.documentUrl);

    if (!year || !semester || !examName || !subject || !branch ||
      (data.resourceType !== 'Paper' && data.resourceType !== 'Notes')) {
      return { success: false, message: 'Year, semester, course/branch, subject, exam name, and document type are required.' };
    }
    if (!documentUrl) {
      return { success: false, message: 'Enter a valid HTTPS link (Google Drive links are supported).' };
    }

    const normalizedData = { year, semester, examName, subject, branch, resourceType: data.resourceType };
    const papers = resourceService.getPapers();

    const isDuplicate = papers.some(p => {
      if (p.isArchived) return false;
      const existingUrl = canonicalizeHttpsUrl(p.documentUrl ?? p.pdfUrl ?? '') ?? p.documentUrl ?? p.pdfUrl;
      return existingUrl === documentUrl &&
        normalizeText(p.year).toLocaleLowerCase() === year.toLocaleLowerCase() &&
        normalizeText(p.semester).toLocaleLowerCase() === semester.toLocaleLowerCase() &&
        normalizeText(p.branch).toLocaleLowerCase() === branch.toLocaleLowerCase() &&
        normalizeText(p.subject).toLocaleLowerCase() === subject.toLocaleLowerCase() &&
        normalizeText(p.examName ?? p.examType ?? '').toLocaleLowerCase() === examName.toLocaleLowerCase() &&
        p.resourceType === data.resourceType;
    });
    if (isDuplicate) {
      return { success: false, message: 'This resource link and metadata already exist in the repository.' };
    }

    const newPaper: QuestionPaper = {
      id: `QP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...normalizedData,
      documentUrl,
      canonicalName: createCanonicalResourceName(normalizedData),
      uploaderId: user.id,
      uploaderEmail: user.email,
      uploaderName: user.fullName,
      createdAt: Date.now(),
      isArchived: false
    };

    try {
      dbService.addRow(T_PAPERS, newPaper);
    } catch {
      return { success: false, message: 'Unable to save this resource in browser storage. Check available storage and try again.' };
    }
    return { success: true, message: `${data.resourceType} successfully added to institutional repository.` };
  },

  archivePaper: (id: string, userRole: Role): boolean => {
    if (userRole !== 'admin') return false;
    dbService.updateRow<QuestionPaper>(T_PAPERS, id, { isArchived: true });
    return true;
  },

  getHelpRequests: (): HelpRequest[] => dbService.getTable<HelpRequest>(T_HELP),

  createHelpRequest: (userEmail: string, data: { topic: string, category: HelpCategory, sessionType: SessionType, description?: string, preferredTime?: string, preferredPlace?: string }) => {
    const newRequest: HelpRequest = {
      id: `HELP-${Date.now()}`,
      requesterEmail: userEmail,
      ...data,
      status: 'Open',
      createdAt: Date.now()
    };
    dbService.addRow(T_HELP, newRequest);
    return newRequest;
  },

  getSkillOffers: (): SkillOffer[] => dbService.getTable<SkillOffer>(T_SKILL_OFFERS),

  createSkillOffer: (userEmail: string, data: { subject: string, category: HelpCategory, description: string, proficiencyPdfUrl: string }) => {
    const newOffer: SkillOffer = {
      id: `EXPERT-${Date.now()}`,
      expertEmail: userEmail,
      ...data,
      createdAt: Date.now()
    };
    dbService.addRow(T_SKILL_OFFERS, newOffer);
    return newOffer;
  },

  offerHelp: (requestId: string, userEmail: string, sessionType: SessionType) => {
    const requests = dbService.getTable<HelpRequest>(T_HELP);
    const req = requests.find(r => r.id === requestId);
    dbService.updateRow<HelpRequest>(T_HELP, requestId, { 
      status: 'Matched', 
      helperEmail: userEmail, 
      helperSessionType: sessionType 
    });
    // Notify the person who requested help
    if (req) {
      dbService.pushNotification(
        req.requesterEmail,
        'skill_help_request',
        'Someone offered to help you',
        `A peer has offered to assist you with "${req.topic}". Check the Skill Share section for details.`,
        requestId
      );
    }
  },

  withdrawHelp: (requestId: string) => {
    dbService.updateRow<HelpRequest>(T_HELP, requestId, { 
      status: 'Open', 
      helperEmail: undefined, 
      helperSessionType: undefined 
    });
  },

  updateHelpStatus: (requestId: string, status: HelpRequestStatus) => {
    dbService.updateRow<HelpRequest>(T_HELP, requestId, { status });
  }
};
