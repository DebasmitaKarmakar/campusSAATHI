
import React, { useState, useEffect } from 'react';
import { canteenService } from '../../services/canteenService';
import { MealType, CanteenConfig, MenuItem, Order, User, GeneralFeedback } from '../../types';

export const AdminCanteen: React.FC<{ user: User }> = ({ user }) => {
  const [config, setConfig] = useState<CanteenConfig>(canteenService.getConfig());
  const [orders, setOrders] = useState<Order[]>(canteenService.getOrders());
  const [feedbacks, setFeedbacks] = useState(canteenService.getAllFeedback());
  const [generalFeedbacks, setGeneralFeedbacks] = useState<GeneralFeedback[]>([]);
  const [activeTab, setActiveTab] = useState<'Pipeline' | 'General Reports'>('Pipeline');
  const [orderSearch, setOrderSearch] = useState('');
  
  const refreshData = () => {
    setOrders(canteenService.getOrders());
    setFeedbacks(canteenService.getAllFeedback());
    setGeneralFeedbacks(canteenService.getAllGeneralFeedback());
    setConfig(canteenService.getConfig());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  const avgRating = (cat: 'taste' | 'quantity' | 'hygiene') => {
    if (feedbacks.length === 0) return 0;
    const sum = feedbacks.reduce((acc, f) => acc + f[cat], 0);
    return (sum / feedbacks.length).toFixed(1);
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.studentName.toLowerCase().includes(orderSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl space-y-10 pb-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-nfsu-navy p-10 rounded-[2.5rem] border-b-8 border-nfsu-gold/50 shadow-2xl text-white">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Institutional Canteen Audit</h2>
          <p className="text-nfsu-gold/70 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Compliance & Student Satisfaction Analytics</p>
        </div>
        <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/20">
           {(['Pipeline', 'General Reports'] as const).map(tab => (
             <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-nfsu-gold text-nfsu-navy' : 'text-white/40 hover:text-white'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map(slot => (
          <div key={slot} className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-2 h-full ${config.isOrderingOpen[slot] ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h3 className="font-black text-xl text-nfsu-navy uppercase italic mb-2">{slot} Window</h3>
            <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${config.isOrderingOpen[slot] ? 'text-green-600' : 'text-red-600'}`}>
               <span className={`w-2 h-2 rounded-full ${config.isOrderingOpen[slot] ? 'bg-green-600' : 'bg-red-600'} animate-pulse`}></span>
               {config.isOrderingOpen[slot] ? 'Receiving Orders' : 'Portal Closed'}
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'Pipeline' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-10">
            <div className="bg-nfsu-maroon p-10 rounded-[2.5rem] shadow-2xl text-white border-b-8 border-black/20">
              <h3 className="text-xl font-black mb-10 uppercase italic tracking-tighter text-nfsu-gold">Quality Performance Indices</h3>
              <div className="space-y-8">
                {['taste', 'quantity', 'hygiene'].map((cat) => (
                  <div key={cat}>
                    <div className="flex justify-between text-[10px] mb-3 uppercase tracking-widest font-black text-white/50">
                      <span>{cat} index</span>
                      <span className="text-nfsu-gold">{avgRating(cat as any)} / 5.0</span>
                    </div>
                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                      <div className="bg-nfsu-gold h-full" style={{ width: `${(Number(avgRating(cat as any)) / 5) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
              <h3 className="text-xl font-black mb-8 uppercase italic text-nfsu-navy">Recent Meal Ratings</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {feedbacks.slice().reverse().map((f, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-nfsu-navy uppercase mb-1">Ref: {f.orderId}</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase">Avg: {((f.taste + f.quantity + f.hygiene) / 3).toFixed(1)}/5.0</div>
                  </div>
                ))}
                {feedbacks.length === 0 && <p className="text-[10px] font-black text-slate-300 uppercase italic text-center py-10">No entries</p>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <h3 className="text-2xl font-black uppercase italic text-nfsu-navy">Operational Pipeline</h3>
                <input type="text" placeholder="TOKEN SEARCH..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase w-80 outline-none focus:border-nfsu-navy" />
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
                {filteredOrders.slice().reverse().map(o => (
                  <div key={o.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 group transition-all hover:bg-white">
                    <div className="flex gap-6 items-center">
                      <span className="font-mono font-black text-nfsu-navy text-xl tracking-tighter w-20">{o.id}</span>
                      <div>
                        <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{o.studentName}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{o.type} • {new Date(o.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 ${
                      o.status === 'Served' ? 'status-served' : 
                      o.status === 'Cancelled' ? 'status-expired' : 'status-pending'
                    }`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
          <h3 className="text-2xl font-black uppercase italic text-nfsu-navy mb-10 underline decoration-nfsu-gold underline-offset-8">Institutional Grievance Registry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {generalFeedbacks.slice().reverse().map(f => (
              <div key={f.id} className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-200 hover:border-nfsu-maroon transition-all">
                <div className="flex justify-between items-center mb-6">
                   <span className="px-3 py-1 bg-nfsu-maroon text-white text-[9px] font-black uppercase rounded-lg">{f.category}</span>
                   <span className="text-[9px] font-black text-slate-400">{new Date(f.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase mb-8 italic">"{f.comment}"</p>
                <div className="pt-6 border-t border-slate-200">
                  <div className="text-[10px] font-black text-nfsu-navy uppercase tracking-widest">
                    Entity: {f.isAnonymous ? 'ANONYMOUS AUDIT' : f.reporterEmail}
                  </div>
                </div>
              </div>
            ))}
            {generalFeedbacks.length === 0 && <div className="col-span-full py-32 text-center text-slate-300 font-black uppercase italic tracking-widest">Grievance Feed Clear</div>}
          </div>
        </div>
      )}
    </div>
  );
};
