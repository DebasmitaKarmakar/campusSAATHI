
import React from 'react';
import { OpportunityPost, OpportunityMode } from '../../types';
import { opportunityService } from '../../services/opportunityService';

interface OpportunityCardProps {
  post: OpportunityPost;
  isAdmin: boolean;
  onAction: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ post, isAdmin, onAction }) => {
  const getModeColor = (mode: OpportunityMode) => {
    switch (mode) {
      case 'Online': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Offline': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Hybrid': return 'bg-purple-50 text-purple-600 border-purple-100';
    }
  };

  const handleVerify = (approve: boolean) => {
    opportunityService.verifyPost(post.id, approve);
    onAction();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      opportunityService.deletePost(post.id);
      onAction();
    }
  };

  const isExpired = post.status === 'Expired';
  const isPending = post.status === 'Pending';

  return (
    <div className={`p-6 bg-white rounded-3xl border border-slate-200 flex flex-col h-full hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden ${isExpired ? 'opacity-70 grayscale' : ''}`}>
      {/* Background ID Decoration */}
      <div className="absolute top-4 right-4 text-[40px] font-black text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {post.id}
      </div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getModeColor(post.mode)}`}>
          {post.mode}
        </span>
        {post.posterRole === 'admin' && (
          <span className="bg-indigo-600 text-white text-[8px] px-2 py-1 rounded-full font-bold uppercase shadow-sm">
            Admin Verified
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 relative z-10">
        <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
          {post.title}
        </h4>
        
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
          <span className="w-auto px-1.5 py-0.5 rounded-md bg-slate-100 flex items-center justify-center text-[8px] font-black">DATE</span>
          DEADLINE: <span className={isExpired ? 'text-red-500' : 'text-indigo-500'}>{new Date(post.deadline).toLocaleDateString()}</span>
        </div>

        {post.description && (
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
            {post.description}
          </p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3 relative z-10">
        <div className="flex gap-2">
          {post.documentUrl && (
            <a 
              href={post.documentUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-xl text-center hover:bg-slate-100 transition-colors border border-slate-100 uppercase"
            >
              DOC View Record
            </a>
          )}
          {post.externalUrl && (
            <a 
              href={post.externalUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-xl text-center hover:bg-indigo-100 transition-colors border border-indigo-100 uppercase"
            >
              URL Link Access
            </a>
          )}
        </div>

        {isAdmin && isPending && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button 
              onClick={() => handleVerify(true)}
              className="py-2.5 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-50"
            >
              Approve
            </button>
            <button 
              onClick={() => handleVerify(false)}
              className="py-2.5 bg-red-50 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-100"
            >
              Reject
            </button>
          </div>
        )}

        {isAdmin && (post.posterRole === 'admin' || isExpired) && (
          <button 
            onClick={handleDelete}
            className="w-full py-2 text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors text-center"
          >
            Delete Record
          </button>
        )}
      </div>
    </div>
  );
};
