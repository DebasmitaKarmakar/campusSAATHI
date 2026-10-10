
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { profileService, ProfileActivitySummary } from '../../services/profileService';

interface MyProfileProps {
  user: User;
  onProfileUpdate: (updatedUser: User) => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({ user, onProfileUpdate }) => {
  const [summary, setSummary] = useState<ProfileActivitySummary | null>(null);
  const [preferredName, setPreferredName] = useState(user.preferredName || '');
  const [department, setDepartment] = useState(user.department || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSummary = () => {
    setSummary(profileService.getActivitySummary(user.email));
  };

  useEffect(() => {
    fetchSummary();
  }, [user.email]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        profileService.updateProfile(user.email, { profilePhoto: base64 });
        onProfileUpdate({ ...user, profilePhoto: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    profileService.updateProfile(user.email, { preferredName, department });
    onProfileUpdate({ ...user, preferredName, department });
    setTimeout(() => {
      setIsUpdating(false);
      fetchSummary();
    }, 500);
  };

  if (!summary) return null;

  return (
    <div className="w-full max-w-5xl space-y-10 animate-fadeIn pb-20">
      {/* --- IDENTITY SECTION --- */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden">
        <div className="bg-nfsu-navy p-10 flex flex-col md:flex-row items-center gap-10 border-b-8 border-nfsu-gold">
          <div className="relative group">
            <div className="w-40 h-40 bg-white rounded-[2.5rem] flex items-center justify-center p-2 shadow-2xl overflow-hidden border-4 border-white/20">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} className="w-full h-full object-cover rounded-[2rem]" alt="Profile" />
              ) : (
                <span className="text-nfsu-navy font-black text-6xl italic">
                  {(user.preferredName || user.fullName).charAt(0)}
                </span>
              )}
            </div>
            <label className="absolute -bottom-3 -right-3 bg-nfsu-gold text-nfsu-navy p-3 rounded-2xl shadow-xl cursor-pointer hover:bg-white transition-all border-4 border-nfsu-navy">
              <input type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.171-1.171A1 1 0 0011.828 3H8.172a1 1 0 00-.707.293L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </label>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center gap-3 mb-2 justify-center md:justify-start">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">{user.preferredName || user.fullName}</h2>
              <span className="px-3 py-1 bg-white/10 text-nfsu-gold text-[10px] font-black rounded-lg border border-white/20 uppercase tracking-widest">
                {user.role} LEVEL
              </span>
            </div>
            <p className="text-white/60 font-bold text-sm mb-6 uppercase tracking-tight">{user.department} • {user.email}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="text-[10px] font-black text-nfsu-gold/50 uppercase mb-1 tracking-widest">Institutional ID</div>
                <div className="text-white font-mono font-black tracking-widest">{user.numericId}</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="text-[10px] font-black text-nfsu-gold/50 uppercase mb-1 tracking-widest">Account Status</div>
                <div className="text-white font-black uppercase text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                  {user.status}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <h3 className="text-lg font-black text-nfsu-navy uppercase tracking-[0.2em] italic">Identity Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preferred Display Name</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-nfsu-navy outline-none"
                  value={preferredName}
                  onChange={e => setPreferredName(e.target.value)}
                  placeholder="Enter alias (Optional)"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Branch / Department</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-nfsu-navy outline-none"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="E.G. CYBER SECURITY, DIGITAL FORENSICS..."
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <h3 className="text-sm font-black text-nfsu-navy uppercase tracking-[0.1em]">Timeline</h3>
                 <div className="flex gap-4">
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Last Login: {new Date(user.lastLogin).toLocaleString()}</span>
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                 </div>
              </div>
              <button 
                type="submit" 
                disabled={isUpdating}
                className="px-10 py-4 bg-nfsu-navy text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-nfsu-maroon transition-all shadow-xl shadow-nfsu-navy/20 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Save Registry Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* --- ACTIVITY SUMMARY SECTION --- */}
      <h3 className="text-3xl font-black text-nfsu-navy uppercase italic tracking-tighter">Activity Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Canteen Stats */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col justify-between group hover:border-nfsu-gold transition-all">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 border border-slate-100">
               <span className="text-[10px] font-black uppercase text-nfsu-navy">MEAL</span>
            </div>
            <h4 className="text-sm font-black text-nfsu-navy uppercase tracking-widest mb-6">Canteen Transactions</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Orders</span>
                <span className="text-2xl font-black text-nfsu-navy italic">{summary.canteen.totalOrders}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Avg Rating</span>
                <span className="text-sm font-black text-nfsu-maroon italic">{summary.canteen.avgRatingGiven}/5.0</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">LAST STATUS: {summary.canteen.lastOrderStatus.toUpperCase()}</span>
          </div>
        </div>

        {/* Lost & Found Stats */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col justify-between group hover:border-nfsu-gold transition-all">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 border border-slate-100">
               <span className="text-[10px] font-black uppercase text-nfsu-navy">REC</span>
            </div>
            <h4 className="text-sm font-black text-nfsu-navy uppercase tracking-widest mb-6">Recovery Registry</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Reported Lost</span>
                <span className="text-2xl font-black text-nfsu-navy italic">{summary.lostFound.itemsReportedLost}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Successful Recoveries</span>
                <span className="text-sm font-black text-nfsu-gold italic">{summary.lostFound.itemsRecovered} Cases</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50 text-right">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">FOUND LOGS: {summary.lostFound.itemsReportedFound}</span>
          </div>
        </div>

        {/* Opportunity Stats */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col justify-between group hover:border-nfsu-gold transition-all">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 border border-slate-100">
               <span className="text-[10px] font-black uppercase text-nfsu-navy">JOB</span>
            </div>
            <h4 className="text-sm font-black text-nfsu-navy uppercase tracking-widest mb-6">Opportunity Window</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Posts</span>
                <span className="text-2xl font-black text-nfsu-navy italic">{summary.opportunities.totalPosted}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Approved</span>
                <span className="text-sm font-black text-green-600 italic">{summary.opportunities.approvedPosts} Live</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PENDING VALIDATION: {summary.opportunities.pendingPosts}</span>
          </div>
        </div>

        {/* Resource Sharing Stats */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col justify-between group hover:border-nfsu-gold transition-all">
          <div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 border border-slate-100">
               <span className="text-[10px] font-black uppercase text-nfsu-navy">EDU</span>
            </div>
            <h4 className="text-sm font-black text-nfsu-navy uppercase tracking-widest mb-6">Skill Share / Paper Bank</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Papers Banked</span>
                <span className="text-2xl font-black text-nfsu-navy italic">{summary.resources.papersUploaded}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Sessions Completed</span>
                <span className="text-sm font-black text-nfsu-maroon italic">{summary.resources.helpSessionsCompleted} Sessions</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50 text-right">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">REQUESTS CREATED: {summary.resources.helpRequestsCreated}</span>
          </div>
        </div>
      </div>

      <div className="bg-nfsu-maroon p-10 rounded-[3rem] text-white shadow-2xl border-b-8 border-black/20">
        <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">Identity Verification & Accountability</h4>
        <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-tight">
          CampusWhispers utilizes high-integrity identity binding. Your profile summary reflects your verified contributions to the NFSU institutional community. 
          Misrepresentation or misuse of institutional modules is tracked for audit integrity.
        </p>
      </div>
    </div>
  );
};
