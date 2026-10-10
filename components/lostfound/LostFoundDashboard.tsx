
import React, { useState, useEffect } from 'react';
import { lostFoundService } from '../../services/lostFoundService';
import { User, LFItem, LFCategory, LFPostType } from '../../types';
import { ItemCard } from './ItemCard';
import { NewPostModal } from './NewPostModal';

export const LostFoundDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [items, setItems] = useState<LFItem[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Lost' | 'Found' | 'My Posts'>('All');
  const [showModal, setShowModal] = useState<LFPostType | null>(null);
  const [search, setSearch] = useState('');

  const refreshItems = () => {
    setItems(lostFoundService.getItems());
  };

  useEffect(() => {
    refreshItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'Lost') return item.type === 'LostReport' && item.status !== 'Collected';
    if (activeTab === 'Found') return item.type === 'FoundReport' && item.status !== 'Collected';
    if (activeTab === 'My Posts') return (
      item.reporterEmail === user.email ||   // original poster (lost or found report)
      item.finderEmail   === user.email ||   // person who reported finding a lost item
      item.claimantEmail === user.email      // person who claimed a found item as theirs
    );
    
    return item.status !== 'Collected';
  });

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lost & Found</h2>
          <p className="text-slate-500">Trace and recover items within the campus premises.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowModal('LostReport')}
            className="px-6 py-2 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-all"
          >
            Report Lost
          </button>
          <button 
            onClick={() => setShowModal('FoundReport')}
            className="px-6 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all"
          >
            Report Found
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
          {(['All', 'Lost', 'Found', 'My Posts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Search items..." 
          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registry Entry Missing</div>
            <p className="text-slate-400 font-medium">No items found matching your filters.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <ItemCard key={item.id} item={item} currentUser={user} onAction={refreshItems} />
          ))
        )}
      </div>

      {showModal && (
        <NewPostModal 
          type={showModal} 
          user={user} 
          onClose={() => setShowModal(null)} 
          onCreated={() => { setShowModal(null); refreshItems(); }} 
        />
      )}
    </div>
  );
};
