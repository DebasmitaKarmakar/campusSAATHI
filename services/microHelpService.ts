import { dbService } from './dbService';
import { User } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MHCategory = 'Financial' | 'Material' | 'Medical';
export type MHStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Resolved';
export type MHOfferStatus = 'Pending' | 'Accepted' | 'Declined';
export type MHChatStatus = 'Active' | 'Closed';

export interface MHRequest {
  id: string;
  // Requester info
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorPhone?: string;
  // Content
  title: string;
  category: MHCategory;
  description: string;
  contactInfo?: string;          // phone or email for helpers
  isAnonymous: boolean;
  // Files (base64)
  documentUrl?: string;
  documentName?: string;
  qrCodeUrl?: string;            // UPI QR — only for Financial
  // Moderation
  status: MHStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  // Reporting
  reportedBy: string[];
  // Timestamps
  createdAt: number;
  expiresAt: number;             // createdAt + 10 days
}

export interface MHOffer {
  id: string;
  postId: string;
  offerEmail: string;
  offerName: string;
  message: string;
  status: MHOfferStatus;
  createdAt: number;
}

export interface MHChatMessage {
  id: string;
  chatId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export interface MHChat {
  id: string;
  postId: string;
  offerId: string;
  requesterEmail: string;
  helperEmail: string;
  status: MHChatStatus;
  createdAt: number;
}

// ─── Tables ───────────────────────────────────────────────────────────────────

const TABLES = {
  requests: 'mh_requests',
  offers: 'mh_offers',
  chats: 'mh_chats',
  messages: 'mh_messages',
} as const;

const EXPIRY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

// ─── Service ──────────────────────────────────────────────────────────────────

export const microHelpService = {

  // ── Requests ──────────────────────────────────────────────────────────────

  getAll: (): MHRequest[] => {
    const now = Date.now();
    const rows = dbService.getTable<MHRequest>(TABLES.requests);
    // Auto-expire
    const updated = rows.map(r =>
      r.status === 'Approved' && r.expiresAt < now ? { ...r, status: 'Expired' as MHStatus } : r
    );
    dbService.saveTable(TABLES.requests, updated);
    return updated.sort((a, b) => b.createdAt - a.createdAt);
  },

  getPublic: (): MHRequest[] =>
    microHelpService.getAll().filter(r => r.status === 'Approved'),

  getPending: (): MHRequest[] =>
    microHelpService.getAll().filter(r => r.status === 'Pending'),

  getByUser: (email: string): MHRequest[] =>
    microHelpService.getAll().filter(r => r.authorEmail === email),

  getById: (id: string): MHRequest | undefined =>
    microHelpService.getAll().find(r => r.id === id),

  submit: (user: User, data: Omit<MHRequest, 'id' | 'authorId' | 'authorEmail' | 'authorName' | 'status' | 'reviewedBy' | 'reviewedAt' | 'reportedBy' | 'createdAt' | 'expiresAt'>): MHRequest => {
    const now = Date.now();
    const req: MHRequest = {
      id: `MH-${now}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      authorId: user.id,
      authorEmail: user.email,
      authorName: user.preferredName || user.fullName,
      status: 'Pending',
      reportedBy: [],
      createdAt: now,
      expiresAt: now + EXPIRY_MS,
      ...data,
    };
    try {
      dbService.addRow<MHRequest>(TABLES.requests, req);
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw e;
    }
    // Notify admins/faculty
    const wl: { email: string; role: string }[] = JSON.parse(
      localStorage.getItem('cw_whitelist') ?? '[]'
    );
    wl.filter(u => u.role === 'admin' || u.role === 'faculty').forEach(u => {
      dbService.pushNotification(
        u.email,
        'grievance_reported' as any,
        'New MicroHelp Request',
        `"${req.title}" needs moderation.`,
        req.id
      );
    });
    return req;
  },

  approve: (id: string, reviewedBy: string, note?: string) => {
    dbService.updateRow<MHRequest>(TABLES.requests, id, {
      status: 'Approved',
      reviewedBy,
      reviewedAt: Date.now(),
      reviewNote: note,
    });
    const req = microHelpService.getById(id);
    if (req) {
      dbService.pushNotification(
        req.authorEmail,
        'grievance_reported' as any,
        'MicroHelp Request Approved',
        `Your request "${req.title}" has been approved and is now public.`,
        id
      );
    }
  },

  reject: (id: string, reviewedBy: string, note: string) => {
    dbService.updateRow<MHRequest>(TABLES.requests, id, {
      status: 'Rejected',
      reviewedBy,
      reviewedAt: Date.now(),
      reviewNote: note,
    });
    const req = microHelpService.getById(id);
    if (req) {
      dbService.pushNotification(
        req.authorEmail,
        'grievance_reported' as any,
        'MicroHelp Request Rejected',
        `Your request "${req.title}" was not approved. Reason: ${note}`,
        id
      );
    }
  },

  markResolved: (id: string) => {
    dbService.updateRow<MHRequest>(TABLES.requests, id, { status: 'Resolved' });
  },

  report: (id: string, reporterEmail: string) => {
    const req = microHelpService.getById(id);
    if (!req) return;
    if (req.reportedBy.includes(reporterEmail)) return;
    dbService.updateRow<MHRequest>(TABLES.requests, id, {
      reportedBy: [...req.reportedBy, reporterEmail],
    });
  },

  delete: (id: string) => {
    dbService.deleteRow(TABLES.requests, id);
  },

  // ── Offers ────────────────────────────────────────────────────────────────

  getOffersForPost: (postId: string): MHOffer[] =>
    dbService.getTable<MHOffer>(TABLES.offers)
      .filter(o => o.postId === postId)
      .sort((a, b) => b.createdAt - a.createdAt),

  getOffersByUser: (email: string): MHOffer[] =>
    dbService.getTable<MHOffer>(TABLES.offers).filter(o => o.offerEmail === email),

  submitOffer: (postId: string, user: User, message: string): MHOffer => {
    const offer: MHOffer = {
      id: `MHO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      postId,
      offerEmail: user.email,
      offerName: user.preferredName || user.fullName,
      message,
      status: 'Pending',
      createdAt: Date.now(),
    };
    dbService.addRow<MHOffer>(TABLES.offers, offer);
    const req = microHelpService.getById(postId);
    if (req) {
      dbService.pushNotification(
        req.authorEmail,
        'skill_help_request' as any,
        'Someone wants to help!',
        `${offer.offerName} offered to help with "${req.title}".`,
        postId
      );
    }
    return offer;
  },

  hasOffered: (postId: string, email: string): boolean =>
    dbService.getTable<MHOffer>(TABLES.offers)
      .some(o => o.postId === postId && o.offerEmail === email),

  // ── Chats ─────────────────────────────────────────────────────────────────

  getChatForOffer: (offerId: string): MHChat | undefined =>
    dbService.getTable<MHChat>(TABLES.chats).find(c => c.offerId === offerId),

  getChatById: (chatId: string): MHChat | undefined =>
    dbService.getTable<MHChat>(TABLES.chats).find(c => c.id === chatId),

  openChat: (postId: string, offerId: string, requesterEmail: string, helperEmail: string): MHChat => {
    const existing = microHelpService.getChatForOffer(offerId);
    if (existing) return existing;
    const chat: MHChat = {
      id: `MHCH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      postId,
      offerId,
      requesterEmail,
      helperEmail,
      status: 'Active',
      createdAt: Date.now(),
    };
    dbService.addRow<MHChat>(TABLES.chats, chat);
    return chat;
  },

  getChatsForUser: (email: string): MHChat[] =>
    dbService.getTable<MHChat>(TABLES.chats)
      .filter(c => c.requesterEmail === email || c.helperEmail === email)
      .sort((a, b) => b.createdAt - a.createdAt),

  // ── Messages ──────────────────────────────────────────────────────────────

  getMessages: (chatId: string): MHChatMessage[] =>
    dbService.getTable<MHChatMessage>(TABLES.messages)
      .filter(m => m.chatId === chatId)
      .sort((a, b) => a.createdAt - b.createdAt),

  sendMessage: (chatId: string, user: User, text: string): MHChatMessage => {
    const msg: MHChatMessage = {
      id: `MHCM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      chatId,
      senderEmail: user.email,
      senderName: user.preferredName || user.fullName,
      text,
      createdAt: Date.now(),
    };
    dbService.addRow<MHChatMessage>(TABLES.messages, msg);
    // Notify other party
    const chat = microHelpService.getChatById(chatId);
    if (chat) {
      const recipient = chat.requesterEmail === user.email ? chat.helperEmail : chat.requesterEmail;
      dbService.pushNotification(
        recipient,
        'skill_help_request' as any,
        'New MicroHelp Message',
        `${msg.senderName}: ${text.slice(0, 60)}`,
        chatId
      );
    }
    return msg;
  },
};