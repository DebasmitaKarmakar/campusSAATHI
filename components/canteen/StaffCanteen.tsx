
import React, { useState, useEffect } from 'react';
import { canteenService } from '../../services/canteenService';
import { Order, MenuItem, MealType, User, GeneralFeedback } from '../../types';

export const StaffCanteen: React.FC<{ user: User }> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState(canteenService.getConfig());
  const [feedbacks, setFeedbacks] = useState(canteenService.getAllFeedback());
  const [generalFeedbacks, setGeneralFeedbacks] = useState<GeneralFeedback[]>([]);
  const [activeView, setActiveView] = useState<'Orders' | 'Menu' | 'Reports'>('Orders');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Menu Item Management State
  const [menuTab, setMenuTab] = useState<MealType>('Lunch');
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Lunch' as MealType });

  // Decline State
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const refreshData = () => {
    setOrders(canteenService.getOrders());
    setFeedbacks(canteenService.getAllFeedback());
    setGeneralFeedbacks(canteenService.getAllGeneralFeedback());
    setConfig(canteenService.getConfig());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    window.addEventListener('cw_db_update', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('cw_db_update', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  const handleAction = (id: string, action: 'Served' | 'Expired', reason?: string) => {
    canteenService.updateOrderStatus(id, action, reason);
    refreshData();
  };

  const confirmDecline = () => {
    if (!declineReason.trim()) {
      alert('Institutional accountability requires a reason for declining orders.');
      return;
    }
    if (showDeclineModal) {
      handleAction(showDeclineModal, 'Expired', declineReason);
      setShowDeclineModal(null);
      setDeclineReason('');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    // Prevent duplicate menu item (same name + category)
    const isDuplicate = config.menu.some(
      m => m.name.trim().toLowerCase() === newItem.name.trim().toLowerCase() && m.category === newItem.category
    );
    if (isDuplicate) {
      alert(`A menu item named "${newItem.name}" already exists in the ${newItem.category} category. Duplicate entries are not permitted.`);
      return;
    }

    const item: MenuItem = {
      id: `ITEM-${Date.now()}`,
      name: newItem.name,
      price: Number(newItem.price),
      category: newItem.category,
      available: true,
      createdBy: user.id
    };

    const newMenu = [...config.menu, item];
    canteenService.saveConfig({ ...config, menu: newMenu });
    refreshData();
    setNewItem({ name: '', price: '', category: newItem.category });
  };

  const toggleItemAvailability = (itemId: string) => {
    const newMenu = config.menu.map(item => 
      item.id === itemId ? { ...item, available: !item.available } : item
    );
    canteenService.saveConfig({ ...config, menu: newMenu });
    refreshData();
  };

  const deleteMenuItem = (itemId: string) => {
    if (!confirm('Permanent deletion of institutional menu record. Proceed?')) return;
    const newMenu = config.menu.filter(item => item.id !== itemId);
    canteenService.saveConfig({ ...config, menu: newMenu });
    refreshData();
  };

  const toggleSlot = (slot: MealType) => {
    const newToggles = { ...config.isOrderingOpen, [slot]: !config.isOrderingOpen[slot] };
    canteenService.saveConfig({ ...config, isOrderingOpen: newToggles });
    refreshData();
  };

  const filteredOrders = orders.filter(o => 
    o.status === 'Pending' && (
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="w-full max-w-7xl space-y-10 animate-fadeIn pb-20">
      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-nfsu-navy/95 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-md w-full shadow-2xl border-4 border-nfsu-maroon animate-slideUp">
            <h3 className="text-2xl font-black text-nfsu-maroon text-center mb-6 uppercase italic">Decline Order</h3>
            <textarea
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold h-32 outline-none focus:border-nfsu-maroon uppercase mb-6"
              placeholder="ENTER REASON FOR DECLINING..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => { setShowDeclineModal(null); setDeclineReason(''); }} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-xl text-[10px] uppercase border-b-4 border-slate-200">Cancel</button>
              <button onClick={confirmDecline} className="flex-2 py-4 bg-nfsu-maroon text-white font-black rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-4 border-black/20">Confirm Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-nfsu-navy p-10 rounded-[2.5rem] border-b-8 border-nfsu-gold/50 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-institutional-pattern opacity-5"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white">Canteen Service Ops</h2>
          <p className="text-nfsu-gold/70 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Active Registry & Performance Audit</p>
        </div>
        <div className="relative z-10 flex bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-sm">
           {(['Orders', 'Menu', 'Reports'] as const).map(view => (
             <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === view ? 'bg-nfsu-gold text-nfsu-navy shadow-lg' : 'text-white/40 hover:text-white'}`}
             >
               {view}
             </button>
           ))}
        </div>
      </div>

      {activeView === 'Orders' && (
        <div className="space-y-8 animate-fadeIn">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map(slot => {
              const isOpen = config.isOrderingOpen[slot];
              return (
                <div key={slot} className={`p-8 rounded-[2rem] shadow-xl border-2 transition-all relative overflow-hidden bg-white ${isOpen ? 'border-slate-100' : 'border-red-100'}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-xs text-nfsu-navy uppercase tracking-widest italic">{slot} Portal</h3>
                      <p className={`text-[9px] font-black uppercase mt-1 ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {isOpen ? 'ACTIVE' : 'HALTED'}
                      </p>
                    </div>
                    <button onClick={() => toggleSlot(slot)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-b-4 border-black/10 shadow-lg ${isOpen ? 'bg-nfsu-maroon text-white' : 'bg-green-600 text-white'}`}>
                      {isOpen ? 'Halt Orders' : 'Authorize Slot'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase italic text-nfsu-navy">Operational Pipeline</h3>
              <input type="text" placeholder="TOKEN/NAME SEARCH..." className="px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black w-80 outline-none focus:border-nfsu-navy transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredOrders.map(o => (
                <div key={o.id} className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-200 relative group overflow-hidden transition-all hover:bg-white hover:border-nfsu-navy">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-3xl font-black font-mono tracking-tighter text-nfsu-navy italic">{o.id}</span>
                    <span className="px-3 py-1 bg-nfsu-navy text-white text-[8px] font-black uppercase rounded tracking-widest">{o.type}</span>
                  </div>
                  <div className="font-black text-slate-800 uppercase text-lg mb-4">{o.studentName}</div>
                  <div className="bg-white rounded-2xl p-5 mb-10 space-y-3 border border-slate-100">
                    {o.items.map(i => <div key={i.name} className="flex justify-between font-black text-slate-700 text-[11px]"><span>{i.name}</span> <span className="text-nfsu-maroon">x{i.quantity}</span></div>)}
                    <div className="pt-3 border-t border-slate-50 flex justify-between">
                      <span className="text-[9px] font-black text-slate-300">TOTAL</span>
                      <span className="text-xs font-black text-nfsu-navy">INR {o.total}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleAction(o.id, 'Served')} className="py-5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase border-b-4 border-black/20 shadow-lg shadow-green-100 active:translate-y-0.5 transition-all">Served</button>
                    <button onClick={() => setShowDeclineModal(o.id)} className="py-5 bg-white text-slate-400 rounded-2xl font-black text-[10px] border-2 border-slate-100 hover:border-nfsu-maroon hover:text-nfsu-maroon transition-all">Decline</button>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && <div className="col-span-full py-32 text-center text-slate-200 font-black uppercase italic tracking-widest text-xl">Registry Empty</div>}
            </div>
          </div>
        </div>
      )}

      {activeView === 'Menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fadeIn">
          {/* Add Item Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100 sticky top-24">
              <h3 className="text-2xl font-black uppercase italic text-nfsu-navy mb-8">Menu Registry</h3>
              <form onSubmit={handleAddItem} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Item Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="E.G. CHICKEN THALI" 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-nfsu-navy"
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Price (INR)</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="INR" 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-nfsu-navy"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Institutional Slot</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-nfsu-navy"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value as MealType})}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-5 bg-nfsu-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-4 border-black/20 hover:bg-nfsu-maroon transition-all mt-4">Add to Registry</button>
              </form>
            </div>
          </div>

          {/* List Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                <h3 className="text-2xl font-black uppercase italic text-nfsu-navy underline decoration-nfsu-gold decoration-4 underline-offset-8">Active Inventory</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setMenuTab(t)}
                      className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${menuTab === t ? 'bg-white text-nfsu-navy shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {config.menu.filter(m => m.category === menuTab).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100 hover:border-nfsu-navy/30 transition-all group">
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[10px] uppercase border-2 ${item.available ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                          {item.available ? 'IN' : 'OUT'}
                       </div>
                       <div>
                         <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{item.name}</h4>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">INR {item.price}</p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleItemAvailability(item.id)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${item.available ? 'bg-white text-slate-400 border-slate-200' : 'bg-green-600 text-white border-black/10'}`}
                      >
                        {item.available ? 'Mark Out' : 'Mark In'}
                      </button>
                      <button 
                        onClick={() => deleteMenuItem(item.id)}
                        className="px-4 py-2 bg-white text-nfsu-maroon border-2 border-nfsu-maroon/20 hover:bg-nfsu-maroon hover:text-white rounded-xl text-[9px] font-black uppercase transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {config.menu.filter(m => m.category === menuTab).length === 0 && (
                  <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">No records found for this slot</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'Reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fadeIn">
          {/* Meal Satisfaction Feed */}
          <div className="bg-nfsu-navy p-10 rounded-[2.5rem] shadow-2xl text-white border-b-8 border-nfsu-gold">
            <h3 className="text-xl font-black mb-10 uppercase italic tracking-tighter text-nfsu-gold">Meal Quality Performance</h3>
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
              {feedbacks.slice().reverse().map((f, i) => {
                const avg = ((f.taste + f.quantity + f.hygiene) / 3).toFixed(1);
                return (
                  <div key={i} className="bg-white/5 p-8 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all">
                     <div className="flex justify-between items-center mb-6">
                       <span className="text-[10px] font-black text-nfsu-gold uppercase tracking-[0.2em]">ORDER: {f.orderId}</span>
                       <span className={`text-2xl font-black italic ${Number(avg) >= 4 ? 'text-green-400' : Number(avg) >= 3 ? 'text-nfsu-gold' : 'text-red-400'}`}>{avg}/5.0</span>
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                        <div className="bg-black/20 p-3 rounded-xl text-center">
                          <div className="text-[8px] font-black uppercase text-white/40 mb-1">Taste</div>
                          <div className="text-sm font-black">{f.taste}</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl text-center">
                          <div className="text-[8px] font-black uppercase text-white/40 mb-1">Qty</div>
                          <div className="text-sm font-black">{f.quantity}</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl text-center">
                          <div className="text-[8px] font-black uppercase text-white/40 mb-1">Hyg</div>
                          <div className="text-sm font-black">{f.hygiene}</div>
                        </div>
                     </div>
                  </div>
                );
              })}
              {feedbacks.length === 0 && <p className="text-[10px] font-black text-white/30 text-center py-32 uppercase tracking-widest italic">No quality data received</p>}
            </div>
          </div>

          {/* Institutional Grievances Feed */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-nfsu-navy uppercase italic">Grievance Audit Registry</h3>
              <span className="px-4 py-1.5 bg-nfsu-maroon text-white text-[9px] font-black rounded-lg animate-pulse">{generalFeedbacks.length} REPORTS</span>
            </div>
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
              {generalFeedbacks.slice().reverse().map((f) => (
                <div key={f.id} className="p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-nfsu-maroon transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-3 py-1.5 bg-nfsu-maroon text-white text-[9px] font-black uppercase rounded-lg tracking-widest shadow-lg shadow-nfsu-maroon/20">{f.category}</span>
                    <span className="text-[9px] font-black text-slate-400 italic">{new Date(f.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase mb-8 border-l-4 border-nfsu-maroon pl-6 italic">"{f.comment}"</p>
                  <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-[10px] font-black text-nfsu-navy uppercase tracking-[0.2em]">
                      ENTITY: <span className="text-nfsu-maroon">{f.isAnonymous ? 'ANONYMOUS AUDIT' : f.reporterEmail?.split('@')[0]}</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-300">REF: {f.id.split('-')[1]}</span>
                  </div>
                </div>
              ))}
              {generalFeedbacks.length === 0 && <p className="text-[10px] font-black text-slate-300 text-center py-32 uppercase tracking-widest italic">Institutional Registry Clear</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
