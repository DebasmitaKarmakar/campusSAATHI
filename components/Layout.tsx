import React, { useState, useEffect } from 'react';
import { Images } from '../src/assets/images';

// Dark mode logic lives here, not in a separate hook file
const getInitialDark = () => localStorage.getItem('cw_theme') === 'dark';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('cw_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('cw_theme', 'light');
    }
  }, [isDark]);

  const toggle = () => setIsDark(p => !p);
  return (
    <div className="min-h-screen flex flex-col dark:bg-slate-900 transition-colors duration-300" style={{backgroundColor: isDark ? undefined : '#fde8e8'}}>
        <header className="bg-nfsu-navy py-3 px-4 md:py-5 md:px-8 sticky top-0 z-50 shadow-2xl border-b-[6px] border-nfsu-gold">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white flex items-center justify-center p-1 border-2 border-nfsu-gold shadow-[0_0_15px_rgba(197,173,88,0.3)] flex-shrink-0">
            <img
              src={Images.nfsuLogo}
              alt="logo"
              className="w-full h-full object-contain"
            />
          </div>
            <div>
              <h1 className="text-base md:text-2xl font-black tracking-tight text-white leading-none uppercase flex items-baseline">
                CAMPUS<span className="text-nfsu-gold">WHISPERS</span>
                <span className="ml-2 w-1.5 h-1.5 bg-nfsu-gold rounded-full animate-pulse"></span>
              </h1>
              <p className="text-[9px] md:text-[10px] text-nfsu-gold/80 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-0.5 md:mt-1.5">National Forensic Sciences University, Tripura</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4">
             <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
             <span className="px-4 py-1.5 bg-white/5 text-nfsu-gold text-[10px] font-black rounded border border-nfsu-gold/30 uppercase tracking-[0.2em] backdrop-blur-sm">
                STUDENTS HELP PORTAL
             </span>
          </div>
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl border border-nfsu-gold/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-nfsu-gold" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-nfsu-gold" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-12 relative z-10">
        {children}
      </main>
      <footer style={{backgroundColor: isDark ? undefined : '#fffde7'}} className="py-10 px-8 border-t-4 border-nfsu-gold dark:bg-slate-800 dark:border-nfsu-gold/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black text-nfsu-navy uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} CampusWhispers • Institutional Authority • NFSU
          </div>
          <div className="flex gap-6">
            <span className="w-2 h-2 rounded-full bg-nfsu-navy"></span>
            <span className="w-2 h-2 rounded-full bg-nfsu-maroon"></span>
            <span className="w-2 h-2 rounded-full bg-nfsu-gold"></span>
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Excellence in Forensic Science
          </div>
        </div>
      </footer>
    </div>
  );
};
