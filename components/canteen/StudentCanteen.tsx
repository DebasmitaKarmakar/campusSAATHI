
import React, { useState, useEffect } from 'react';
import { canteenService } from '../../services/canteenService';
import { User, Order, MenuItem, MealType, CanteenConfig, GeneralFeedbackCategory } from '../../types';

export const StudentCanteen: React.FC<{ user: User }> = ({ user }) => {
  const [config, setConfig] = useState<CanteenConfig>(canteenService.getConfig());
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<MealType>('Lunch');
  
  // Modals
  const [showFeedbackModal, setShowFeedbackModal] = useState<Order | null>(null);
  const [showGeneralFeedbackModal, setShowGeneralFeedbackModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);

  // Form States
  const [feedbackRatings, setFeedbackRatings] = useState({ taste: 0, quantity: 0, hygiene: 0 });
  const [genFeedback, setGenFeedback] = useState({ 
    category: 'Service Speed' as GeneralFeedbackCategory, 
    comment: '', 
    isAnonymous: true 
  });
  const [cancelReason, setCancelReason] = useState('');
  
  const [hasOrdered, setHasOrdered] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const fetchData = () => {
    const allOrders = canteenService.getOrders();
    const userOrders = allOrders.filter(o => o.studentEmail === user.email);
    setOrders(userOrders);
    setConfig(canteenService.getConfig());
    setHasOrdered(canteenService.hasOrderedForSlot(user.email, activeTab));

    // AUTO-FEEDBACK TRIGGER: If any order is served but not rated, pop the modal
    const servedWithoutFeedback = userOrders.find(o => o.status === 'Served' && !o.feedbackSubmitted);
    if (servedWithoutFeedback && !showFeedbackModal && !showGeneralFeedbackModal && !showCancelModal) {
      setShowFeedbackModal(servedWithoutFeedback);
    }
  };

  useEffect(() => {
    fetchData();
    // Fast polling for instant status updates
    const interval = setInterval(fetchData, 3000);
    window.addEventListener('cw_db_update', fetchData);
    window.addEventListener('storage', fetchData);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('cw_db_update', fetchData);
      window.removeEventListener('storage', fetchData);
    };
  }, [user.email, activeTab]);

  const addToCart = (itemName: string) => {
    setCart(prev => ({ ...prev, [itemName]: (prev[itemName] || 0) + 1 }));
  };

  const handleOrder = () => {
    try {
      const items = (Object.entries(cart) as [string, number][]).map(([name, quantity]) => ({ name, quantity }));
      if (items.length === 0) return;
      if (editingOrderId) {
        canteenService.updateOrderItems(editingOrderId, items);
        setEditingOrderId(null);
      } else {
        canteenService.placeOrder(user.id, user.email, items, activeTab);
      }
      setCart({});
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const submitFeedback = () => {
    if (feedbackRatings.taste === 0 || feedbackRatings.quantity === 0 || feedbackRatings.hygiene === 0) {
      alert('Please provide ratings for all metrics for institutional audit.');
      return;
    }
    if (showFeedbackModal) {
      canteenService.submitFeedback({ orderId: showFeedbackModal.id, ...feedbackRatings });
      setShowFeedbackModal(null);
      setFeedbackRatings({ taste: 0, quantity: 0, hygiene: 0 });
      fetchData();
    }
  };

  const submitGeneralFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genFeedback.comment.trim()) return;
    canteenService.submitGeneralFeedback({
      ...genFeedback,
      reporterEmail: genFeedback.isAnonymous ? undefined : user.email
    });
    alert('Institutional Grievance Filed. The management has been notified.');
    setGenFeedback({ category: 'Service Speed', comment: '', isAnonymous: true });
    setShowGeneralFeedbackModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl animate-fadeIn">
      
      {/* Served Food Feedback (Auto-triggered) */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-nfsu-navy/95 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3rem] p-10 md:p-14 max-w-md w-full shadow-2xl border-4 border-nfsu-gold animate-slideUp">
            <h3 className="text-3xl font-black text-nfsu-navy text-center mb-2 uppercase italic tracking-tighter">Meal Satisfaction</h3>
            <p className="text-[10px] text-slate-400 font-black text-center mb-10 uppercase tracking-widest italic">Institutional Accountability Record: {showFeedbackModal.id}</p>
            <div className="space-y-10">
              {(['taste', 'quantity', 'hygiene'] as const).map(category => (
                <div key={category}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{category} Performance</label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        onClick={() => setFeedbackRatings(prev => ({ ...prev, [category]: star }))} 
                        className={`flex-1 h-12 rounded-xl font-black text-lg transition-all border-2 ${
                          feedbackRatings[category] === star 
                          ? 'bg-nfsu-navy border-nfsu-navy text-white shadow-lg' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-nfsu-navy/30'
                        }`}
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitFeedback} className="w-full mt-12 py-5 bg-nfsu-navy text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl border-b-4 border-black/20 hover:bg-nfsu-maroon transition-colors">Complete Session</button>
          </div>
        </div>
      )}

      {/* General Canteen Feedback (Manual Grievance Desk) */}
      {showGeneralFeedbackModal && (
        <div className="fixed inset-0 bg-nfsu-navy/95 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3rem] p-10 md:p-14 max-w-lg w-full shadow-2xl border-4 border-nfsu-maroon animate-slideUp">
            <h3 className="text-3xl font-black text-nfsu-navy mb-2 uppercase italic tracking-tighter">Institutional Grievance</h3>
            <p className="text-[10px] text-slate-400 font-black mb-10 uppercase tracking-widest">Pricing, Staff behavior, or Service Quality reports</p>
            <form onSubmit={submitGeneralFeedback} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Incident Category</label>
                <select 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-nfsu-maroon"
                  value={genFeedback.category}
                  onChange={e => setGenFeedback({...genFeedback, category: e.target.value as GeneralFeedbackCategory})}
                >
                  <option value="Service Speed">Excessive Wait Times</option>
                  <option value="Staff Behavior">Unprofessional Conduct</option>
                  <option value="Pricing">Price Inconsistencies</option>
                  <option value="Hygiene">Sanitation Failures</option>
                  <option value="Other">Other Grievances</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Evidence/Detail Description</label>
                <textarea 
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold h-36 outline-none focus:border-nfsu-maroon uppercase"
                  placeholder="Elaborate for audit purposes..."
                  value={genFeedback.comment}
                  onChange={e => setGenFeedback({...genFeedback, comment: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                <input 
                  type="checkbox" 
                  id="anon-toggle" 
                  checked={genFeedback.isAnonymous}
                  onChange={e => setGenFeedback({...genFeedback, isAnonymous: e.target.checked})}
                  className="w-6 h-6 accent-nfsu-maroon"
                />
                <label htmlFor="anon-toggle" className="text-[10px] font-black text-nfsu-navy uppercase tracking-widest cursor-pointer">Submit Anonymously</label>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowGeneralFeedbackModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-xl text-[10px] uppercase tracking-widest">Discard</button>
                <button type="submit" className="flex-2 py-4 bg-nfsu-maroon text-white font-black rounded-xl text-[10px] uppercase tracking-[0.3em] shadow-xl border-b-4 border-black/20">File Formal Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
            <div>
              <h2 className="text-3xl font-black text-nfsu-navy uppercase italic">Digital Menu</h2>
              <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-tight">Regulated institutional nutrition.</p>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
              {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setActiveTab(t); setEditingOrderId(null); setCart({}); }}
                  className={`px-6 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === t ? 'bg-nfsu-navy shadow-lg text-white' : 'text-slate-400 hover:text-slate-800'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {!config.isOrderingOpen[activeTab] && (
              <div className="p-10 bg-red-50 text-red-800 rounded-[2rem] border-2 border-red-100 text-center animate-pulse">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Canteen Portal for {activeTab} is currently HALTED by staff.</p>
              </div>
            )}
            
            {hasOrdered && !editingOrderId && (
              <div className="p-10 bg-nfsu-lightgold/30 text-nfsu-maroon rounded-[2rem] border-2 border-nfsu-gold/30 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Active Order Registered. Complete service before next request.</p>
              </div>
            )}
            
            {config.menu.filter(m => m.category === activeTab).map(item => (
              <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100 hover:border-nfsu-navy transition-all group">
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{item.name}</h4>
                  <p className="text-[10px] font-black text-nfsu-navy/50 mt-1 uppercase tracking-widest">INR {item.price}</p>
                </div>
                <button
                  onClick={() => addToCart(item.name)}
                  disabled={!config.isOrderingOpen[activeTab] || (hasOrdered && !editingOrderId)}
                  className="px-8 py-3 bg-white border-2 border-slate-200 hover:border-nfsu-navy hover:text-nfsu-navy text-slate-400 font-black rounded-xl transition-all disabled:opacity-30 shadow-sm text-[10px] uppercase"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* General Grievance Feature Button */}
        <div className="bg-nfsu-navy p-10 rounded-[2.5rem] shadow-2xl border-b-[12px] border-nfsu-gold flex items-center justify-between gap-10 group relative overflow-hidden">
           <div className="absolute inset-0 bg-institutional-pattern opacity-5"></div>
           <div className="relative z-10">
             <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Institutional Grievance Desk</h3>
             <p className="text-nfsu-gold/70 text-[10px] font-black uppercase tracking-[0.3em] mt-2 max-w-sm leading-relaxed">Report pricing, staff behavior, or hygiene failures for administrative audit.</p>
           </div>
           <button 
             onClick={() => setShowGeneralFeedbackModal(true)}
             className="relative z-10 px-8 py-4 bg-white text-nfsu-navy rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-nfsu-maroon hover:text-white transition-all shadow-2xl border-b-4 border-black/10"
           >
             File Formal Report
           </button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.keys(cart).length > 0 && (
          <div className="bg-nfsu-maroon p-10 rounded-[2.5rem] text-white shadow-2xl border-b-8 border-black/20 sticky top-24 z-20 animate-slideUp">
            <h3 className="text-xl font-black mb-10 uppercase tracking-[0.3em] italic">ACTIVE CART</h3>
            <div className="space-y-5 mb-10">
              {(Object.entries(cart) as [string, number][]).map(([name, qty]) => {
                const price = config.menu.find(m => m.name === name)?.price || 0;
                return (
                  <div key={name} className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-tight">{name} <span className="text-nfsu-gold ml-2">x{qty}</span></span>
                    <span className="font-mono text-xs font-black">INR {qty * price}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-6 border-t border-white/20 mb-10 flex justify-between items-end">
               <span className="text-[10px] font-black uppercase opacity-60">AGGREGATE TOTAL</span>
               <span className="text-3xl font-black italic text-nfsu-gold">
                 INR {Object.entries(cart as Record<string, number>).reduce(
                  (acc, [name, qty]) =>
                    acc + qty * (config.menu.find(m => m.name === name)?.price ?? 0),
                  0
                )}
               </span>
            </div>
            <button onClick={handleOrder} className="w-full py-6 bg-white text-nfsu-maroon rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-nfsu-gold transition-all border-b-4 border-slate-200">Submit Verification</button>
          </div>
        )}

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
          <h2 className="text-xl font-black text-nfsu-navy mb-8 uppercase italic underline decoration-nfsu-gold decoration-4 underline-offset-8">Activity Pipeline</h2>
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 scrollbar-hide">
            {orders.length === 0 ? (
               <div className="text-center py-20 text-[10px] font-black text-slate-300 uppercase italic tracking-widest">No Active Registry Entries</div>
            ) : orders.map(o => (
              <div key={o.id} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 relative group transition-all hover:bg-white">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono font-black text-nfsu-navy text-sm tracking-widest">{o.id}</span>
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded border-2 ${
                    o.status === 'Served' ? 'status-served' : 
                    o.status === 'Cancelled' ? 'status-expired' : 'status-pending'
                  }`}>{o.status}</span>
                </div>
                <div className="text-[9px] font-black uppercase text-slate-400">Time: {new Date(o.timestamp).toLocaleTimeString()}</div>
                {o.status === 'Served' && !o.feedbackSubmitted && (
                   <button 
                    onClick={() => setShowFeedbackModal(o)}
                    className="mt-6 w-full py-3 bg-nfsu-gold text-nfsu-navy rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl border-b-4 border-nfsu-navy/20 active:translate-y-0.5 transition-all"
                   >
                     Rate Satisfaction Required
                   </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
