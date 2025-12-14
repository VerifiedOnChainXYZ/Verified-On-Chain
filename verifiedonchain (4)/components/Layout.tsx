import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  const [scrolled, setScrolled] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  const toggleTheme = async (e: React.MouseEvent) => {
    // Ultra OP Animation Logic using View Transitions API
    if (
      !(document as any).startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsDark(!isDark);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Start the transition
    const transition = (document as any).startViewTransition(() => {
      setIsDark(!isDark);
    });

    // Wait for the pseudo-elements to be created
    transition.ready.then(() => {
      // Animate the circle clip-path on the NEW view.
      // Since ::view-transition-new(root) is z-index: 9999 (top),
      // expanding the clip-path from 0 to full reveals the new theme
      // as if it is "engulfing" the screen from the click point.
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath, 
        },
        {
          duration: 700,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          pseudoElement: '::view-transition-new(root)', 
        }
      );
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const DonationCard: React.FC<{ symbol: string; name: string; address: string; color: string }> = ({ symbol, name, address, color }) => (
    <div 
      onClick={() => handleCopy(address, symbol)}
      className="relative flex flex-col items-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden"
    >
       <div className={`absolute top-0 left-0 w-full h-1 ${color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
       <div className="flex items-center gap-2 mb-2">
         <span className={`text-xs font-bold ${color.replace('bg-', 'text-')}`}>{name}</span>
         {copiedAddress === symbol ? (
           <span className="text-[10px] font-bold text-green-500 animate-fade-in">Copied!</span>
         ) : (
           <svg className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
         )}
       </div>
       <div className="w-full bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5">
          <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate text-center select-all">
            {address}
          </p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-200 flex flex-col font-sans selection:bg-brand-500 selection:text-white relative overflow-hidden">
      
      {/* --- Ambient Background Animations --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         {/* Top Left Orb */}
         <div className="absolute top-0 -left-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
         {/* Top Right Orb */}
         <div className="absolute top-0 -right-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-brand-400/20 dark:bg-brand-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
         {/* Bottom Center Orb */}
         <div className="absolute -bottom-60 left-1/2 transform -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-pink-400/20 dark:bg-pink-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
         
         {/* Grid Pattern Overlay */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-10 brightness-100 contrast-150"></div>
      </div>

      {/* --- Floating Navbar --- */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-2 sm:p-4">
        <nav className={`w-full max-w-7xl transition-all duration-300 rounded-2xl px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center ${
          scrolled 
            ? 'glass shadow-lg shadow-black/5 dark:shadow-black/20' 
            : 'bg-transparent'
        }`}>
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group relative shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-r from-brand-500 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg leading-tight tracking-tight text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-500 group-hover:to-indigo-500 transition-all">
                  VerifiedOnChain
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-widest uppercase hidden xs:block">Public Ledger</span>
              </div>
            </Link>
            
            {/* Nav Links & Actions */}
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className={`text-sm font-semibold transition-all duration-300 relative py-1 ${
                    isActive('/') 
                      ? 'text-brand-600 dark:text-brand-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dashboard
                  {isActive('/') && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-full animate-fade-in"></span>}
                </Link>
              </div>
              
              <Link 
                id="nav-verify-btn"
                to="/submit" 
                className={`relative group overflow-hidden px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  isActive('/submit') 
                    ? 'text-white shadow-lg shadow-brand-500/40 transform scale-105' 
                    : 'bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 dark:hover:border-brand-400/50'
                }`}
              >
                {isActive('/submit') && (
                   <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-indigo-600"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className="hidden sm:inline">Verify Wallet</span>
                  <span className="inline sm:hidden">Verify</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </span>
              </Link>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50 shadow-sm backdrop-blur-sm transition-all focus:outline-none hover:rotate-12 group overflow-hidden"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? (
                  /* Sun Icon */
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-transform duration-500 hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                     <circle cx="12" cy="12" r="5" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" />
                  </svg>
                ) : (
                  /* Moon Icon */
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
        </nav>
      </div>

      {/* Main Content with Animated Entry Key */}
      <main 
        key={location.pathname} 
        className="flex-grow relative z-10 pt-20 sm:pt-28 pb-12 animate-page-enter origin-top"
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-[#0B1121]/30 backdrop-blur-md py-8 sm:py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          
          {/* Donation Section */}
          <div className="mb-12 p-6 rounded-3xl bg-gradient-to-br from-white/60 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-purple-500 to-pink-500"></div>
             
             <div className="relative z-10">
               <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 mb-2">
                 Support VerifiedOnChain
               </h3>
               <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
                 Funds help maintain the website free and help the creator ;)
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                 {/* BTC */}
                 <DonationCard 
                    symbol="BTC" 
                    name="Bitcoin" 
                    address="bc1qgs76m8dndacvue3q0lyv8k5um4s84nmaw6evtr" 
                    color="bg-orange-500" 
                 />
                 
                 {/* ETH */}
                 <DonationCard 
                    symbol="ETH" 
                    name="Ethereum" 
                    address="0x78D9A435Ab7a1f8769D9Fc19A15da995e20F1ac0" 
                    color="bg-indigo-500" 
                 />
                 
                 {/* SOL */}
                 <DonationCard 
                    symbol="SOL" 
                    name="Solana" 
                    address="FVJ2P7fKDjtX9aPxx4RS2bGEh2urVKX1FDLSa4kxCpoy" 
                    color="bg-emerald-500" 
                 />
                 
                 {/* PayPal */}
                 <a 
                   href="https://www.paypal.me/VerifiedOnChain" 
                   target="_blank" 
                   rel="noreferrer" 
                   className="relative flex flex-col items-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden"
                 >
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-500">PayPal</span>
                      <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5">
                       <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate text-center group-hover:text-blue-500 transition-colors">
                         paypal.me/VerifiedOnChain
                       </p>
                    </div>
                 </a>
               </div>
             </div>
          </div>

          <div className="flex justify-center mb-6">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center opacity-50 grayscale">
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
          </div>
          <p className="text-slate-500 dark:text-slate-500 text-xs sm:text-sm mb-6 font-medium">
            &copy; {new Date().getFullYear()} VerifiedOnChain. 
            <span className="mx-2 opacity-50">|</span>
             All data is public and read-only.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/5 border border-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] sm:text-xs font-mono backdrop-blur-sm">
            <span>⚠️</span> Disclaimer: No financial advice. Do not share private keys.
          </div>
        </div>
      </footer>
    </div>
  );
};