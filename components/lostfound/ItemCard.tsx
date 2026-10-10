
import React, { useState } from 'react';
import { LFItem, User } from '../../types';
import { lostFoundService } from '../../services/lostFoundService';

interface ItemCardProps {
  item: LFItem;
  currentUser: User;
  onAction: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, currentUser, onAction }) => {
  const [showActionModal, setShowActionModal] = useState<'Find' | 'Claim' | 'Handover' | null>(null);
  const [tempImage, setTempImage] = useState('');
  const [tempText, setTempText] = useState('');
  const [commentText, setCommentText] = useState('');

  const isOwner = item.reporterEmail === currentUser.email;
  // For a FoundReport that has been claimed: the claimant is the true owner
  const isClaimant = item.claimantEmail === currentUser.email;
  const isFinder   = item.finderEmail   === currentUser.email;
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitAction = () => {
    if (showActionModal === 'Handover' && !tempImage) {
      alert('Handover proof image is mandatory.');
      return;
    }

    if (showActionModal === 'Find') {
      lostFoundService.markAsFound(item.id, currentUser.email, {
        foundImage: tempImage,
        location: tempText || 'Campus Area',
        dateTime: new Date().toLocaleString()
      });
    } else if (showActionModal === 'Claim') {
      lostFoundService.claimItem(item.id, currentUser.email, tempText);
    } else if (showActionModal === 'Handover') {
      lostFoundService.uploadHandover(item.id, currentUser.email, tempImage);
    }
    setShowActionModal(null);
    setTempImage('');
    setTempText('');
    onAction();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    lostFoundService.addComment(item.id, currentUser.email, commentText);
    setCommentText('');
    onAction();
  };

  const confirmCollected = () => {
    if (!item.handoverImage) {
      alert('Cannot confirm collection: Handover proof image is missing.');
      return;
    }
    lostFoundService.confirmCollection(item.id, currentUser.email);
    onAction();
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden flex flex-col h-full hover:border-nfsu-gold/50 transition-all">
      <div className="p-5 border-b-2 border-slate-50 flex justify-between items-start bg-slate-50/30">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.type === 'LostReport' ? 'bg-nfsu-maroon text-white' : 'bg-green-600 text-white'}`}>
          {item.type === 'LostReport' ? 'Lost' : 'Found'}
        </span>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
          item.status === 'Collected' ? 'bg-slate-200 text-slate-500' : 
          item.status === 'PendingHandover' ? 'bg-nfsu-gold text-nfsu-navy' : 'bg-nfsu-navy text-white'
        }`}>
          {item.status.toUpperCase()}
        </span>
      </div>

      <div className="h-56 bg-slate-100 relative group">
        {item.itemImage ? (
          <img src={item.itemImage} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Visual Reference Missing</span>
          </div>
        )}
        {item.isSensitive && (
          <div className="absolute top-4 right-4 bg-nfsu-gold text-nfsu-navy text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-widest border border-white/20">
            Sensitive Item
          </div>
        )}
      </div>

      <div className="p-6 flex-1 space-y-4">
        <h3 className="font-black text-nfsu-navy uppercase tracking-tighter text-xl leading-tight">{item.title}</h3>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.description}</p>
        
        <div className="grid grid-cols-2 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>LOC: <span className="text-nfsu-navy">{item.location}</span></div>
          <div>DATE: <span className="text-nfsu-navy">{item.dateTime}</span></div>
        </div>

        {/* Comment Section */}
        <div className="mt-6 space-y-4">
          <h4 className="text-[10px] font-black text-nfsu-navy uppercase tracking-[0.3em] border-b border-slate-100 pb-2">Community Updates</h4>
          <div className="max-h-40 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {item.comments.length === 0 ? (
              <p className="text-[10px] text-slate-300 font-bold uppercase italic">No updates posted</p>
            ) : (
              item.comments.map(c => (
                <div key={c.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-nfsu-navy/60 uppercase">{c.userEmail.split('@')[0]}</span>
                    <span className="text-[8px] text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 leading-snug">{c.text}</p>
                </div>
              ))
            )}
          </div>
          {item.status !== 'Collected' && (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input 
                type="text" 
                placeholder="POST UPDATE..." 
                className="flex-1 bg-slate-100 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tight focus:ring-1 focus:ring-nfsu-navy outline-none"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button type="submit" className="bg-nfsu-navy text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">SEND</button>
            </form>
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t-2 border-slate-100">
        {item.status === 'Collected' ? (
          <div className="text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] italic">Record Archived</div>
        ) : (
          <div className="flex flex-col gap-3">
            {!isOwner && item.status === 'Lost' && (
              <button onClick={() => setShowActionModal('Find')} className="w-full py-3 bg-nfsu-navy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-nfsu-navy/10 border-b-4 border-black/20 transition-all active:translate-y-0.5">Report Finding</button>
            )}
            {!isOwner && item.status === 'Found' && (
              <button onClick={() => setShowActionModal('Claim')} className="w-full py-3 bg-nfsu-maroon text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-nfsu-maroon/10 border-b-4 border-black/20 transition-all active:translate-y-0.5">Claim Ownership</button>
            )}
            {(isFinder || (isOwner && item.type === 'FoundReport')) && !item.handoverImage && item.status === 'PendingHandover' && (
              <button onClick={() => setShowActionModal('Handover')} className="w-full py-3 bg-nfsu-gold text-nfsu-navy rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-nfsu-gold/10 border-b-4 border-black/20 transition-all active:translate-y-0.5">Upload Verification Proof</button>
            )}
            {(isClaimant || (isOwner && item.type === 'LostReport')) && item.status === 'PendingHandover' && item.handoverImage && (
              <button onClick={confirmCollected} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:translate-y-0.5">Verify & Close Case</button>
            )}
            {(isClaimant || (isOwner && item.type === 'LostReport')) && item.status === 'PendingHandover' && !item.handoverImage && (
              <div className="text-[9px] text-nfsu-gold font-black uppercase text-center bg-nfsu-navy p-3 rounded-xl tracking-widest">Awaiting Identity Verification Image</div>
            )}
          </div>
        )}
      </div>

      {showActionModal && (
        <div className="fixed inset-0 bg-nfsu-navy/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full space-y-8 border-4 border-nfsu-gold">
            <h4 className="text-2xl font-black uppercase tracking-tighter italic text-nfsu-navy">
              {showActionModal === 'Find' ? 'Finding Report' : showActionModal === 'Claim' ? 'Identity Proof' : 'Handover Audit'}
            </h4>
            
            {showActionModal === 'Claim' ? (
              <textarea 
                placeholder="Identify marks, lock codes, or specific contents to verify ownership..."
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-bold h-36 outline-none focus:border-nfsu-navy uppercase"
                value={tempText}
                onChange={e => setTempText(e.target.value)}
              />
            ) : (
              <div className="space-y-6">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed text-center">Visual capture is mandatory for institutional community records.</p>
                <div className="border-2 border-dashed border-nfsu-navy/20 rounded-[2rem] p-8 text-center bg-slate-50 hover:bg-white transition-colors">
                  {tempImage ? (
                    <img src={tempImage} className="max-h-40 mx-auto rounded-2xl shadow-xl" alt="Preview" />
                  ) : (
                    <div className="relative">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="text-[10px] font-black text-nfsu-navy/40 uppercase tracking-[0.2em]">Select Image File</div>
                    </div>
                  )}
                </div>
                {showActionModal === 'Find' && (
                  <input 
                    type="text" 
                    placeholder="Exact current coordinates/room/spot..." 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-[11px] font-black uppercase outline-none focus:border-nfsu-navy"
                    value={tempText}
                    onChange={e => setTempText(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => {setShowActionModal(null); setTempImage(''); setTempText('');}} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 tracking-widest border-b-4 border-slate-200">Cancel</button>
              <button onClick={submitAction} className="flex-1 py-4 bg-nfsu-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl border-b-4 border-black/20">Verify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
