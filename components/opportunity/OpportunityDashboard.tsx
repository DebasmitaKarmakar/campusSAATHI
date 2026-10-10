
import React, { useState, useEffect } from 'react';
import { User, OpportunityPost, OpportunityStatus } from '../../types';
import { opportunityService } from '../../services/opportunityService';
import { OpportunityCard } from './OpportunityCard';
import { PostOpportunityModal } from './PostOpportunityModal';

export const OpportunityDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [posts, setPosts] = useState<OpportunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<'Active' | 'Pending' | 'My Posts' | 'Archived'>('Active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshPosts = () => {
    setPosts(opportunityService.getPosts());
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'Active') return post.status === 'Active';
    if (activeTab === 'Pending') return post.status === 'Pending';
    if (activeTab === 'My Posts') return post.posterEmail === user.email;
    if (activeTab === 'Archived') return post.status === 'Expired' || post.status === 'Rejected';
    return false;
  });

  const canVerify = user.role === 'admin';

  return (
    <div className="w-full max-w-6xl space-y-6 animate-fadeIn">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-3xl font-black text-nfsu-navy uppercase italic tracking-tighter">Opportunity Window</h2>
            <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-tight">Verified notice board for community growth pathways.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-4 bg-nfsu-navy text-white font-black rounded-2xl shadow-2xl shadow-nfsu-navy/20 hover:bg-nfsu-maroon transition-all flex items-center gap-3 uppercase text-xs tracking-[0.2em] border-b-4 border-black/20"
          >
            Share Opportunity
          </button>
        </div>

        <div className="flex gap-2 mb-10 bg-slate-100 p-1.5 rounded-2xl w-fit border-2 border-slate-200">
          {(['Active', 'Pending', 'My Posts', 'Archived'] as const).map(tab => {
            if (tab === 'Pending' && !canVerify) return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                  activeTab === tab 
                  ? 'bg-white text-nfsu-navy shadow-md ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                {tab === 'Pending' && posts.filter(p => p.status === 'Pending').length > 0 && (
                  <span className="ml-2 bg-nfsu-maroon text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">
                    {posts.filter(p => p.status === 'Pending').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.length === 0 ? (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
              <p className="text-slate-300 font-black uppercase text-xs tracking-[0.5em] italic">No active opportunities listed</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <OpportunityCard 
                key={post.id} 
                post={post} 
                isAdmin={canVerify} 
                onAction={refreshPosts} 
              />
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <PostOpportunityModal 
          user={user} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            refreshPosts();
          }} 
        />
      )}
    </div>
  );
};
