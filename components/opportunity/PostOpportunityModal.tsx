
import React, { useState } from 'react';
import { User, OpportunityMode } from '../../types';
import { opportunityService } from '../../services/opportunityService';

interface PostOpportunityModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostOpportunityModal: React.FC<PostOpportunityModalProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    mode: 'Offline' as OpportunityMode,
    deadline: '',
    description: '',
    documentUrl: '',
    externalUrl: ''
  });
  const [submitError, setSubmitError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, documentUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) return;
    setSubmitError('');
    const result = opportunityService.createPost(user, formData);
    if ('error' in result) {
      setSubmitError(result.error as string);
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-nfsu-navy/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-slideUp border-4 border-nfsu-gold">
        <div className="bg-nfsu-navy p-10 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Share Opportunity</h2>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors font-black">x</button>
          </div>
          <p className="text-nfsu-gold text-[10px] font-black uppercase tracking-[0.3em]">
            {user.role === 'admin' 
              ? 'Institutional immediate publication mode.' 
              : 'Subject to community administrator verification.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Name of Opportunity</label>
              <input 
                required
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-nfsu-navy outline-none transition-all uppercase tracking-tight"
                placeholder="E.G. GOOGLE WINTER CLOUD INTERNSHIP"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mode</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black outline-none uppercase tracking-widest"
                  value={formData.mode}
                  onChange={e => setFormData({...formData, mode: e.target.value as OpportunityMode})}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deadline</label>
                <input 
                  required
                  type="date"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
              <textarea 
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold h-32 outline-none focus:border-nfsu-navy uppercase"
                placeholder="Key highlights and eligibility context..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supporting Document</label>
                <div className="relative group">
                   <input 
                    type="file" 
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase text-center group-hover:border-nfsu-navy transition-all">
                    {formData.documentUrl ? 'FILE ATTACHED' : 'SELECT FILE'}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Official URL</label>
                <input 
                  type="text"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black outline-none focus:border-nfsu-navy"
                  placeholder="www.example.com or https://..."
                  value={formData.externalUrl}
                  onChange={e => setFormData({...formData, externalUrl: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            {submitError && (
              <div className="mb-4 px-5 py-4 bg-red-50 border-2 border-red-200 rounded-2xl text-[10px] font-black text-red-700 uppercase tracking-widest">
                {submitError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full py-6 bg-nfsu-navy text-white font-black rounded-3xl shadow-2xl shadow-nfsu-navy/20 hover:bg-nfsu-maroon transition-all uppercase tracking-[0.3em] text-xs border-b-4 border-black/20"
            >
              {user.role === 'admin' ? 'Publish Registry' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
