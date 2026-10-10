
import React, { useState } from 'react';
import { LFPostType, LFCategory, User } from '../../types';
import { lostFoundService } from '../../services/lostFoundService';

interface NewPostModalProps {
  type: LFPostType;
  user: User;
  onClose: () => void;
  onCreated: () => void;
}

export const NewPostModal: React.FC<NewPostModalProps> = ({ type, user, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other' as LFCategory,
    location: '',
    dateTime: '',
    itemImage: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, itemImage: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.location) return;
    
    lostFoundService.createItem(user, type, formData);
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-6 text-white ${type === 'LostReport' ? 'bg-red-600' : 'bg-emerald-600'} flex justify-between items-center`}>
          <h2 className="text-xl font-bold">{type === 'LostReport' ? 'Report Lost Item' : 'Report Found Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
              <input 
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                placeholder="e.g. Blue University ID"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as LFCategory})}
              >
                <option value="ID Card">ID Card</option>
                <option value="Wallet">Wallet</option>
                <option value="Electronics">Electronics</option>
                <option value="Documents">Documents</option>
                <option value="Keys">Keys</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
              <input 
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                placeholder="e.g. Canteen Area"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24"
              placeholder="Provide identifying details..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Photo (Required for Found Items)</label>
            <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl">
              <div className="space-y-1 text-center">
                {formData.itemImage ? (
                  <div className="relative inline-block">
                    <img src={formData.itemImage} className="max-h-32 rounded-lg" alt="Preview" />
                    <button type="button" onClick={() => setFormData({...formData, itemImage: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">x</button>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all ${type === 'LostReport' ? 'bg-red-600 shadow-red-100 hover:bg-red-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'}`}
          >
            Create {type === 'LostReport' ? 'Lost' : 'Found'} Post
          </button>
        </form>
      </div>
    </div>
  );
};
