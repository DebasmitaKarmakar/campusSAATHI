import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import {
  MHRequest, MHOffer, MHChat, MHChatMessage, MHCategory, MHStatus,
  microHelpService,
} from '../../services/microHelpService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<MHCategory, string> = {
  Financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Material: 'bg-blue-50 text-blue-700 border-blue-200',
  Medical: 'bg-red-50 text-red-700 border-red-200',
};
const CATEGORY_ICON: Record<MHCategory, string> = {
  Financial: '',
  Material: '',
  Medical: '',
};
const STATUS_COLORS: Record<MHStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Expired: 'bg-slate-100 text-slate-500 border-slate-200',
  Resolved: 'bg-purple-50 text-purple-700 border-purple-200',
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const daysLeft = (expiresAt: number) => {
  const d = Math.ceil((expiresAt - Date.now()) / 86400000);
  return d > 0 ? `${d}d left` : 'Expired';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact chip */
const Chip: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${className}`}>{label}</span>
);

/** File uploader that returns base64 */
/** Compress an image file to a small JPEG base64 string via canvas */
const compressImage = (file: File, maxPx = 280, quality = 0.40): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const FileInput: React.FC<{
  label: string;
  accept?: string;
  onChange: (base64: string, name: string) => void;
  value?: string;
  required?: boolean;
}> = ({ label, accept = '*', onChange, value, required }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [sizeWarning, setSizeWarning] = useState('');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeWarning('');
    setProcessing(true);
    try {
      const isImage = file.type.startsWith('image/');
      let base64: string;
      if (isImage) {
        // Aggressively compress: max 200px, JPEG 0.35 quality — QR codes are B&W so quality loss is fine
        base64 = await compressImage(file, 200, 0.35);
      } else {
        // PDFs are too large for localStorage — store only a filename marker.
        // Users should photograph/screenshot documents and upload as an image instead.
        setSizeWarning('PDF noted by name only. For document verification, please upload a photo or screenshot of the document (PDFs exceed local storage limits).');
        base64 = '__file__:' + file.name;
      }
      onChange(base64, file.name);
    } catch {
      setSizeWarning('Could not read file. Please try a smaller image.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        onClick={() => !processing && ref.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-2xl p-4 text-center transition-all ${processing ? 'border-nfsu-gold bg-nfsu-paper' : value ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-nfsu-gold'}`}
      >
        {processing ? (
          <div className="text-[11px] text-nfsu-gold font-bold animate-pulse"> Processing…</div>
        ) : value ? (
          <div className="text-xs text-green-600 font-bold">✓ File attached</div>
        ) : (
          <div className="text-[11px] text-slate-400 font-bold">Click to upload</div>
        )}
      </div>
      {sizeWarning && (
        <p className="text-amber-600 text-[10px] font-bold mt-1">⚠ {sizeWarning}</p>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  );
};

// ─── Request Card ─────────────────────────────────────────────────────────────

const RequestCard: React.FC<{
  req: MHRequest;
  user: User;
  isAdmin: boolean;
  onSelect: (r: MHRequest) => void;
}> = ({ req, user, isAdmin, onSelect }) => {
  const displayName = req.isAnonymous && !isAdmin ? 'Anonymous' : req.authorName;

  return (
    <div
      className="bg-white rounded-[1.5rem] border-2 border-slate-100 hover:border-nfsu-gold/40 p-5 cursor-pointer transition-all shadow-sm hover:shadow-md group"
      onClick={() => onSelect(req)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Chip label={req.category} className={CATEGORY_COLORS[req.category]} />
            <Chip label={req.status} className={STATUS_COLORS[req.status]} />
            {req.isAnonymous && <Chip label="Anonymous" className="bg-slate-50 text-slate-500 border-slate-200" />}
          </div>
          <h3 className="font-black text-nfsu-navy uppercase italic text-sm group-hover:text-nfsu-maroon transition-colors line-clamp-1">
            {CATEGORY_ICON[req.category]} {req.title}
          </h3>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-3">
        {req.description}
      </p>
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        <span>By {displayName}</span>
        <div className="flex gap-2">
          <span>{fmtDate(req.createdAt)}</span>
          {req.status === 'Approved' && <span className="text-amber-500">{daysLeft(req.expiresAt)}</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Request Detail ───────────────────────────────────────────────────────────

const RequestDetail: React.FC<{
  req: MHRequest;
  user: User;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ req, user, isAdmin, onClose, onUpdate }) => {
  const [offers, setOffers] = useState<MHOffer[]>([]);
  const [chatView, setChatView] = useState<MHChat | null>(null);
  const [offerMsg, setOfferMsg] = useState('');
  const [adminNote, setAdminNote] = useState(req.reviewNote ?? '');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    setOffers(microHelpService.getOffersForPost(req.id));
  }, [req.id]);

  const isOwner = req.authorEmail === user.email;
  const hasOffered = microHelpService.hasOffered(req.id, user.email);
  const displayName = req.isAnonymous && !isAdmin ? 'Anonymous' : req.authorName;
  const canOffer = req.status === 'Approved' && !isOwner && !hasOffered && user.role !== 'canteen';

  const handleOffer = () => {
    if (!offerMsg.trim()) return;
    microHelpService.submitOffer(req.id, user, offerMsg.trim());
    setOfferMsg('');
    setOffers(microHelpService.getOffersForPost(req.id));
  };

  const handleApprove = () => {
    microHelpService.approve(req.id, user.email, adminNote);
    onUpdate();
    onClose();
  };

  const handleReject = () => {
    if (!adminNote.trim()) { alert('Please provide a rejection reason.'); return; }
    microHelpService.reject(req.id, user.email, adminNote);
    onUpdate();
    onClose();
  };

  const handleReport = () => {
    if (window.confirm('Report this request as inappropriate?')) {
      microHelpService.report(req.id, user.email);
      onUpdate();
    }
  };

  const openChat = (offer: MHOffer) => {
    const chat = microHelpService.openChat(req.id, offer.id, req.authorEmail, offer.offerEmail);
    setChatView(chat);
  };

  const waLink = (contactInfo?: string) => {
    const phone = contactInfo?.replace(/\D/g, '') ?? '';
    const msg = encodeURIComponent(
      `Hello, I saw your MicroHelp request "${req.title}" on the platform and I would like to help.`
    );
    return phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
  };

  if (chatView) {
    return (
      <ChatWindow
        chat={chatView}
        user={user}
        req={req}
        onClose={() => setChatView(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border-2 border-nfsu-gold/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-nfsu-paper to-white p-6 border-b-2 border-nfsu-paper">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Chip label={req.category} className={CATEGORY_COLORS[req.category]} />
              <Chip label={req.status} className={STATUS_COLORS[req.status]} />
              {req.isAnonymous && !isAdmin && <Chip label="Anonymous" className="bg-slate-50 text-slate-500 border-slate-200" />}
            </div>
            <h2 className="text-xl font-black text-nfsu-navy uppercase italic">
              {CATEGORY_ICON[req.category]} {req.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-bold mt-1">
              By <span className="text-nfsu-navy">{displayName}</span> · {fmtDate(req.createdAt)}
              {req.status === 'Approved' && <span className="ml-2 text-amber-500">{daysLeft(req.expiresAt)}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-nfsu-maroon p-2 rounded-xl transition-colors">✕</button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Description */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</div>
          <p className="text-sm text-slate-600 leading-relaxed">{req.description}</p>
        </div>

        {/* Contact info — visible to helpers on approved requests */}
        {req.status === 'Approved' && req.contactInfo && (
          <div className="bg-nfsu-paper rounded-2xl p-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</div>
            <p className="text-sm font-bold text-nfsu-navy">{req.contactInfo}</p>
          </div>
        )}

        {/* Admin-only: real identity */}
        {isAdmin && req.isAnonymous && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">⚠ Admin Only — Real Identity</div>
            <p className="text-sm font-bold text-slate-800">{req.authorName} · {req.authorEmail}</p>
          </div>
        )}

        {/* Supporting document */}
        {req.documentUrl && (
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supporting Document</div>
            {req.documentUrl.startsWith('__file__:') ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black rounded-xl border border-slate-200">
                 {req.documentName ?? req.documentUrl.replace('__file__:', '')}
                <span className="text-[9px] text-slate-400 font-bold">(PDF — not downloadable)</span>
              </div>
            ) : (
              <a
                href={req.documentUrl}
                download={req.documentName ?? 'document'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-nfsu-navy text-white text-xs font-black rounded-xl hover:bg-nfsu-maroon transition-all"
              >
                 {req.documentName ?? 'Download Document'}
              </a>
            )}
          </div>
        )}

        {/* QR Code */}
        {req.category === 'Financial' && req.qrCodeUrl && req.status === 'Approved' && (
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Donation QR Code (UPI)</div>
            <div className="inline-block bg-white border-2 border-nfsu-gold rounded-2xl p-3">
              <img
                src={req.qrCodeUrl}
                alt="UPI QR Code"
                className="w-40 h-40 object-contain rounded-xl"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">
              Scan with any UPI app · Platform does not process payments
            </p>
          </div>
        )}

        {/* Review note (visible to owner or admin) */}
        {req.reviewNote && (isAdmin || isOwner) && (
          <div className={`rounded-2xl p-4 border ${req.status === 'Rejected' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Moderator Note</div>
            <p className="text-sm font-medium text-slate-700">{req.reviewNote}</p>
          </div>
        )}

        {/* Report button — not for owner/admin */}
        {!isOwner && !isAdmin && req.status === 'Approved' && (
          <button
            onClick={handleReport}
            className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
          >
             Report Request
          </button>
        )}

        {/* Admin moderation panel */}
        {isAdmin && req.status === 'Pending' && (
          <div className="bg-nfsu-paper rounded-2xl p-5 border-2 border-nfsu-gold/20">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Admin Moderation</div>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Optional note for requester..."
              rows={2}
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-nfsu-gold mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 py-3 bg-green-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all"
              >
                ✓ Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        )}

        {/* "I Can Help" button */}
        {canOffer && (
          <div className="bg-nfsu-paper rounded-2xl p-5 border-2 border-nfsu-gold/20">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Offer Help</div>
            <textarea
              value={offerMsg}
              onChange={e => setOfferMsg(e.target.value)}
              placeholder="Write a short message about how you can help..."
              rows={2}
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-nfsu-gold mb-3"
            />
            <button
              onClick={handleOffer}
              disabled={!offerMsg.trim()}
              className="w-full py-3 bg-nfsu-navy text-nfsu-gold font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-nfsu-maroon disabled:opacity-40 transition-all"
            >
               I Can Help
            </button>
          </div>
        )}
        {hasOffered && !isOwner && (
          <div className="text-center text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-2xl p-3">
            ✓ You have already offered to help — wait for the requester to open a chat.
          </div>
        )}

        {/* Offers list — visible to owner and admin */}
        {(isOwner || isAdmin) && offers.length > 0 && (
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Helpers ({offers.length})
            </div>
            <div className="space-y-3">
              {offers.map(offer => {
                const existingChat = microHelpService.getChatForOffer(offer.id);
                return (
                  <div key={offer.id} className="bg-nfsu-paper rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-sm text-nfsu-navy uppercase italic">{offer.offerName}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{offer.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{fmtDate(offer.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => openChat(offer)}
                        className="flex-shrink-0 px-3 py-2 bg-nfsu-navy text-white text-[10px] font-black rounded-xl uppercase tracking-wide hover:bg-nfsu-maroon transition-all"
                      >
                        {existingChat ? ' Open Chat' : 'Start Chat'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Owner can mark resolved */}
        {isOwner && req.status === 'Approved' && (
          <button
            onClick={() => { microHelpService.markResolved(req.id); onUpdate(); onClose(); }}
            className="w-full py-3 bg-purple-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all"
          >
            ✓ Mark as Resolved
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Chat Window ──────────────────────────────────────────────────────────────

const ChatWindow: React.FC<{
  chat: MHChat;
  user: User;
  req: MHRequest;
  onClose: () => void;
}> = ({ chat, user, req, onClose }) => {
  const [messages, setMessages] = useState<MHChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(microHelpService.getMessages(chat.id));
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    microHelpService.sendMessage(chat.id, user, text.trim());
    setMessages(microHelpService.getMessages(chat.id));
    setText('');
  };

  const otherEmail = chat.requesterEmail === user.email ? chat.helperEmail : chat.requesterEmail;
  const waPhone = req.contactInfo?.replace(/\D/g, '') ?? '';
  const waMsg = encodeURIComponent(
    `Hello, I saw your MicroHelp request "${req.title}" on the platform and I would like to help.`
  );
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${waMsg}`
    : `https://wa.me/?text=${waMsg}`;

  return (
    <div className="bg-white rounded-[2rem] border-2 border-nfsu-gold/20 shadow-2xl flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-nfsu-paper bg-gradient-to-r from-nfsu-navy to-nfsu-maroon rounded-t-[2rem]">
        <div>
          <p className="font-black text-white uppercase italic text-sm"> Chat</p>
          <p className="text-[10px] text-nfsu-gold/80 font-bold uppercase tracking-wide">{otherEmail}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wide hover:bg-green-600 transition-all"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.14 1.532 5.879L0 24l6.302-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.957 0-3.784-.54-5.35-1.477l-.384-.228-3.742.895.912-3.635-.251-.4A9.776 9.776 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.419 0 9.818 4.4 9.818 9.818 0 5.419-4.399 9.818-9.818 9.818z"/>
            </svg>
            Continue on WhatsApp
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white p-2 rounded-xl transition-colors">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-slate-400 font-bold py-6">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderEmail === user.email;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-nfsu-navy text-white rounded-br-sm' : 'bg-nfsu-paper text-slate-800 rounded-bl-sm'}`}>
                {!isMine && (
                  <p className="text-[10px] font-black text-nfsu-gold uppercase tracking-wide mb-1">{msg.senderName}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-nfsu-paper flex gap-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Type a message..."
          className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-nfsu-gold"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="px-4 py-2.5 bg-nfsu-navy text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-nfsu-maroon disabled:opacity-40 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// ─── New Request Form ─────────────────────────────────────────────────────────

const NewRequestForm: React.FC<{
  user: User;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ user, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    title: '',
    category: 'Financial' as MHCategory,
    description: '',
    contactInfo: '',
    isAnonymous: false,
    documentName: '',   // filename only — stored in DB
    qrCodeUrl: '',      // compressed tiny image — stored in DB
  });
  // Preview-only state — kept in memory, NEVER written to localStorage
  const [docPreview, setDocPreview] = useState('');   // base64 for display only
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (form.category === 'Medical' && !docPreview && !form.documentName) e.document = 'Supporting document is mandatory for Medical requests';
    if (form.category === 'Financial' && !form.qrCodeUrl) e.qr = 'UPI QR code is required for Financial requests';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    try {
      microHelpService.submit(user, {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        contactInfo: form.contactInfo.trim() || undefined,
        isAnonymous: form.isAnonymous,
        // documentUrl intentionally NOT stored — images are too large for localStorage.
        // documentName records that a doc was uploaded (for admin awareness).
        documentUrl: undefined,
        documentName: form.documentName || undefined,
        qrCodeUrl: form.qrCodeUrl || undefined,
      });
      onSubmit();
    } catch (e: any) {
      if (e?.message === 'QUOTA_EXCEEDED') {
        setErrors(prev => ({ ...prev, _storage: 'Browser storage is full. Open DevTools → Application → Local Storage → clear "cw_db_" keys, then try again.' }));
      } else {
        setErrors(prev => ({ ...prev, _storage: 'Unexpected error. Please try again.' }));
      }
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border-2 border-nfsu-gold/20 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-br from-nfsu-paper to-white p-6 border-b-2 border-nfsu-paper flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-nfsu-navy uppercase italic">Request Help</h2>
          <p className="text-[11px] text-slate-400 font-bold">Fill in the details. Your request will be reviewed before going public.</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-nfsu-maroon p-2 rounded-xl transition-colors">✕</button>
      </div>

      <div className="p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Request Title <span className="text-red-500">*</span></label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Brief title for your request"
            className={`w-full border-2 ${errors.title ? 'border-red-400' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nfsu-gold`}
          />
          {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.title}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Help Category <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {(['Financial', 'Material', 'Medical'] as MHCategory[]).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                className={`py-3 rounded-xl border-2 text-xs font-black uppercase transition-all ${form.category === cat ? 'bg-nfsu-navy text-white border-nfsu-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-gold'}`}
              >
                {CATEGORY_ICON[cat]} {cat}
              </button>
            ))}
          </div>
          {form.category === 'Medical' && (
            <p className="text-amber-600 text-[10px] font-bold mt-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
              Supporting document (prescription / hospital bill) is mandatory for Medical requests.
            </p>
          )}
          {form.category === 'Financial' && (
            <p className="text-emerald-600 text-[10px] font-bold mt-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              UPI QR code is required. Donors will scan it directly — the platform does not process payments.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Detailed Description <span className="text-red-500">*</span></label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            placeholder="Describe your need in detail..."
            className={`w-full border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-nfsu-gold`}
          />
          {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.description}</p>}
        </div>

        {/* Contact info */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Contact Details (optional)</label>
          <input
            value={form.contactInfo}
            onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
            placeholder="Phone number or email for helpers"
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nfsu-gold"
          />
          <p className="text-[10px] text-slate-400 font-bold mt-1">Visible to helpers once request is approved. Used for WhatsApp redirect.</p>
        </div>

        {/* Supporting document */}
        <div>
          <FileInput
            label={`Supporting Document${form.category === 'Medical' ? '' : ' (optional)'}`}
            accept="image/*,.pdf"
            required={form.category === 'Medical'}
            value={docPreview || form.documentName}
            onChange={(base64, name) => {
              // Keep image in local preview state only — do NOT store in form (would go to localStorage)
              setDocPreview(base64);
              setForm(f => ({ ...f, documentName: name }));
            }}
          />
          {errors.document && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.document}</p>}
          <p className="text-[10px] text-slate-400 font-bold mt-1">Examples: prescription, hospital bill, proof of need.</p>
        </div>

        {/* QR Code — Financial only */}
        {form.category === 'Financial' && (
          <div>
            <FileInput
              label="UPI QR Code"
              accept="image/*"
              required
              value={form.qrCodeUrl}
              onChange={(base64) => setForm(f => ({ ...f, qrCodeUrl: base64 }))}
            />
            {errors.qr && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.qr}</p>}
          </div>
        )}

        {/* Anonymous */}
        <div
          onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${form.isAnonymous ? 'border-nfsu-navy bg-nfsu-paper' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.isAnonymous ? 'bg-nfsu-navy border-nfsu-navy' : 'border-slate-300'}`}>
            {form.isAnonymous && <span className="text-white text-[10px] font-black">✓</span>}
          </div>
          <div>
            <p className="font-black text-sm text-nfsu-navy uppercase italic">Post Anonymously</p>
            <p className="text-[10px] text-slate-400 font-bold">Your name will be hidden on the public dashboard. Admins can still see your identity for verification.</p>
          </div>
        </div>

        {/* Storage error */}
        {errors._storage && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-[11px] font-bold text-red-700">
            ⚠ {errors._storage}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-xl uppercase text-[10px] tracking-widest hover:border-nfsu-maroon hover:text-nfsu-maroon transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-nfsu-navy text-nfsu-gold font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-nfsu-maroon transition-all"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type DashView = 'public' | 'mine' | 'admin' | 'chats';

export const MicroHelpDashboard: React.FC<{ user: User }> = ({ user }) => {
  const isAdmin = user.role === 'admin' || user.role === 'faculty';
  const [dashView, setDashView] = useState<DashView>('public');
  const [requests, setRequests] = useState<MHRequest[]>([]);
  const [selected, setSelected] = useState<MHRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<MHCategory | 'All'>('All');
  const [chats, setChats] = useState<MHChat[]>([]);
  const [activeChatPost, setActiveChatPost] = useState<{ chat: MHChat; req: MHRequest } | null>(null);
  const [tick, setTick] = useState(0);

  const reload = () => setTick(t => t + 1);

  useEffect(() => {
    if (dashView === 'public') setRequests(microHelpService.getPublic());
    else if (dashView === 'mine') setRequests(microHelpService.getByUser(user.email));
    else if (dashView === 'admin') setRequests(microHelpService.getAll());
    else if (dashView === 'chats') setChats(microHelpService.getChatsForUser(user.email));
  }, [dashView, user.email, tick]);

  const filtered = filterCat === 'All' ? requests : requests.filter(r => r.category === filterCat);

  const TABS: { id: DashView; label: string; roles?: string[] }[] = [
    { id: 'public', label: 'Public Board' },
    { id: 'mine', label: 'My Requests' },
    { id: 'chats', label: 'My Chats' },
    { id: 'admin', label: 'Moderation', roles: ['admin', 'faculty'] },
  ];

  if (activeChatPost) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <ChatWindow
          chat={activeChatPost.chat}
          user={user}
          req={activeChatPost.req}
          onClose={() => { setActiveChatPost(null); reload(); }}
        />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <NewRequestForm
          user={user}
          onSubmit={() => { setShowForm(false); reload(); }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <RequestDetail
          req={selected}
          user={user}
          isAdmin={isAdmin}
          onClose={() => { setSelected(null); reload(); }}
          onUpdate={reload}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6 animate-fadeIn">
      {/* Page header */}
      <div className="bg-white rounded-[2rem] border-2 border-nfsu-gold/20 shadow-xl overflow-hidden">
        <div className="p-6 md:p-10 bg-gradient-to-br from-nfsu-paper to-white border-b-2 border-nfsu-paper flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-nfsu-navy uppercase italic tracking-tighter">
               <span className="text-nfsu-gold">Micro</span>Help
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-1">
              Community support · Financial · Material · Medical
            </p>
          </div>
          {user.role !== 'canteen' && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-nfsu-navy text-nfsu-gold font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-nfsu-maroon transition-all shadow-lg"
            >
              + Request Help
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b-2 border-nfsu-paper overflow-x-auto">
          {TABS.filter(t => !t.roles || t.roles.includes(user.role)).map(tab => (
            <button
              key={tab.id}
              onClick={() => setDashView(tab.id)}
              className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${dashView === tab.id ? 'border-nfsu-gold text-nfsu-navy' : 'border-transparent text-slate-400 hover:text-nfsu-navy'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chats view */}
      {dashView === 'chats' && (
        <div className="space-y-3">
          {chats.length === 0 && (
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-12 text-center">
              <p className="text-3xl mb-3"></p>
              <p className="font-black text-slate-400 uppercase text-sm">No active chats</p>
            </div>
          )}
          {chats.map(chat => {
            const req = microHelpService.getById(chat.postId);
            const msgs = microHelpService.getMessages(chat.id);
            const lastMsg = msgs[msgs.length - 1];
            return (
              <div
                key={chat.id}
                onClick={() => req && setActiveChatPost({ chat, req })}
                className="bg-white rounded-[1.5rem] border-2 border-slate-100 hover:border-nfsu-gold/40 p-5 cursor-pointer transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-nfsu-navy uppercase italic text-sm group-hover:text-nfsu-maroon">
                      {req?.title ?? chat.postId}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">
                      {chat.requesterEmail === user.email ? `Helper: ${chat.helperEmail}` : `Requester: ${chat.requesterEmail}`}
                    </p>
                    {lastMsg && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {lastMsg.senderName}: {lastMsg.text}
                      </p>
                    )}
                  </div>
                  <div className="text-nfsu-gold font-black text-[10px] uppercase tracking-widest">Open →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {dashView !== 'chats' && (
        <>
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {(['All', 'Financial', 'Material', 'Medical'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${filterCat === cat ? 'bg-nfsu-navy text-white border-nfsu-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-nfsu-gold'}`}
              >
                {cat !== 'All' && CATEGORY_ICON[cat as MHCategory]} {cat}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest self-center">
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cards grid */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-12 text-center">
              <p className="text-3xl mb-3"></p>
              <p className="font-black text-slate-400 uppercase text-sm">
                {dashView === 'mine' ? 'You have not submitted any requests yet.' : 'No requests found.'}
              </p>
              {dashView === 'mine' && user.role !== 'canteen' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-6 py-3 bg-nfsu-navy text-nfsu-gold font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-nfsu-maroon transition-all"
                >
                  + Request Help Now
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  user={user}
                  isAdmin={isAdmin}
                  onSelect={setSelected}
                />
              ))}
            </div>
          )}

          {/* Admin pending count callout */}
          {dashView === 'admin' && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center text-[11px] font-black text-amber-700 uppercase tracking-widest">
              {requests.filter(r => r.status === 'Pending').length} request(s) pending moderation
            </div>
          )}
        </>
      )}
    </div>
  );
};