import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storageService } from '../services/storage';
import { fetchWalletStats, maskAddress, getExplorerLink, getExchangeRate, formatUSD } from '../services/chain';
import { UserProfile, WalletStats, SUPPORTED_CHAINS, Blockchain } from '../types';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (username) {
        const p = await storageService.getProfileByUsername(username);
        setProfile(p || null);
        
        if (p) {
          fetchWalletStats(p.address, p.chain).then(data => {
            setStats(data);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }
    };
    
    loadProfile();
  }, [username]);

  const rate = profile ? getExchangeRate(profile.chain) : 0;
  const usdBalance = stats ? stats.balance * rate : 0;
  const chainInfo = profile ? SUPPORTED_CHAINS.find(c => c.code === profile.chain) : null;

  const getDataSourceName = (chain: Blockchain) => {
    switch (chain) {
      case Blockchain.BTC: return 'Mempool.space';
      case Blockchain.ETH: return 'Etherscan';
      case Blockchain.BNB: return 'BscScan';
      case Blockchain.SOL: return 'Solana RPC';
      default: return 'Blockchain';
    }
  };

  const calculateDaysActive = () => {
    if (!stats?.firstTxDate) return 0;
    const first = new Date(stats.firstTxDate).getTime();
    const now = Date.now();
    return Math.floor((now - first) / (1000 * 60 * 60 * 24));
  };

  const getWalletStatus = () => {
    if (!stats?.latestTransaction) return 'Unknown';
    const last = stats.latestTransaction.timestamp;
    const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
    if (daysSince < 7) return { text: 'Very Active', color: 'text-emerald-500 bg-emerald-500/10' };
    if (daysSince < 30) return { text: 'Active', color: 'text-blue-500 bg-blue-500/10' };
    if (daysSince < 180) return { text: 'Moderate', color: 'text-amber-500 bg-amber-500/10' };
    return { text: 'Dormant', color: 'text-slate-500 bg-slate-500/10' };
  };

  const status = getWalletStatus();

  if (!profile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
           <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Profile Not Found</h2>
        <p className="text-slate-500 mb-8">We couldn't locate the user @{username}</p>
        <Link to="/" className="px-8 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30 hover:scale-105">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 mb-8 transition-colors group">
         <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3 group-hover:border-brand-500 group-hover:shadow-lg transition-all">
             <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
         </div>
         Back to Dashboard
      </Link>

      {/* Cyberpunk Header Card */}
      <div className="relative rounded-[2rem] md:rounded-[2.5rem] p-[1px] bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 mb-8 animate-slide-up shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 opacity-20 dark:opacity-30 blur-xl"></div>
        
        <div className="relative bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gradient-to-b from-brand-500/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 md:-mr-32 md:-mt-32 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full md:w-auto text-center sm:text-left">
              <div className="relative group shrink-0">
                 <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                 <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                    {profile?.logoUrl ? (
                      <img src={profile.logoUrl} alt={profile.username} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold text-slate-300 dark:text-slate-600">{profile?.username.charAt(0).toUpperCase()}</span>
                    )}
                 </div>
                 <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 bg-white dark:bg-slate-900 p-1 sm:p-1.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-800" title="Verified">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                 </div>
              </div>
              
              <div className="w-full">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 truncate max-w-full">
                  @{profile?.username}
                </h1>
                
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mb-4">
                  <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{profile ? maskAddress(profile.address) : '...'}</span>
                    <button onClick={() => navigator.clipboard.writeText(profile?.address || '')} className="hover:text-brand-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                  
                  {profile?.socials && (
                    <div className="flex items-center gap-2">
                      {/* Twitter */}
                      {profile.socials.twitter && (
                        <a href={`https://x.com/${profile.socials.twitter}`} target="_blank" rel="noreferrer" title="X (Twitter)" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-black transition-all">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        </a>
                      )}
                      
                      {/* Instagram */}
                      {profile.socials.instagram && (
                        <a href={`https://instagram.com/${profile.socials.instagram}`} target="_blank" rel="noreferrer" title="Instagram" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-red-500 hover:to-purple-500 transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M7.5 3h9a4.5 4.5 0 014.5 4.5v9a4.5 4.5 0 01-4.5 4.5h-9A4.5 4.5 0 013 16.5v-9A4.5 4.5 0 017.5 3z" /></svg>
                        </a>
                      )}

                      {/* Threads */}
                      {profile.socials.threads && (
                        <a href={`https://www.threads.net/@${profile.socials.threads}`} target="_blank" rel="noreferrer" title="Threads" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-black transition-all">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.166 1.344c-6.22 0-10.74 3.737-10.74 9.99 0 4.137 2.052 7.746 5.378 9.537.498.27.766-.11.642-.516-.14-.465-.405-1.393-.563-1.996-.134-.51.107-.8.528-.574 2.59 1.393 6.22 1.05 8.163-1.874.552-.83.896-1.85.896-2.93 0-4.008-2.618-6.608-6.19-6.608-3.778 0-6.02 2.684-6.02 6.137 0 1.625.617 3.064 1.776 3.963 1.063.824 2.457.94 3.492.296.656-.408.924-1.31.572-2.162-.29-.705-1.158-1.222-2.123-.974-.757.194-1.218.843-1.077 1.543.085.422.422.756.924.756.28 0 .5-.084.622-.244.02-.023.04-.044.053-.066.02-.04.03-.075.035-.098l.006-.027c.216-.927-.47-1.92-1.578-1.92-1.933 0-3.322 1.668-3.322 3.953 0 2.668 1.935 4.697 4.935 4.697 1.874 0 3.398-.568 4.542-1.574 1.583-1.393 2.277-3.483 2.277-5.592 0-5.35-4.228-8.7-9.352-8.7-5.833 0-9.458 4.237-9.458 9.878 0 4.27 2.273 7.69 5.862 9.208 1.066.45 1.02 1.637-.308 1.637-4.46 0-7.794-4.01-7.794-9.303 0-6.936 5.09-11.43 11.96-11.43z"/></svg>
                        </a>
                      )}

                      {/* Reddit */}
                      {profile.socials.reddit && (
                        <a href={`https://www.reddit.com/user/${profile.socials.reddit}`} target="_blank" rel="noreferrer" title="Reddit" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#FF4500] transition-all">
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Network:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${chainInfo?.color}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {chainInfo?.name}
                    </span>
                    <a href={profile ? getExplorerLink(profile.address, profile.chain) : '#'} target="_blank" rel="noreferrer" className="ml-2 text-xs text-brand-500 hover:underline">View on Explorer ↗</a>
                  </div>
                  
                  {profile && (
                    <span className="hidden sm:block text-slate-300 dark:text-slate-700">|</span>
                  )}

                  {profile && (
                    <span className="text-slate-500 dark:text-slate-500 text-xs flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Data from {getDataSourceName(profile.chain)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Balance Hero */}
            <div className="w-full md:w-auto text-center md:text-right bg-white/50 dark:bg-black/20 p-6 rounded-2xl border border-white/50 dark:border-white/5 shadow-inner min-w-[200px]">
               <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Net Worth</p>
               {loading ? (
                 <div className="h-12 w-48 bg-slate-200 dark:bg-slate-700/50 rounded-lg animate-pulse mx-auto md:ml-auto"></div>
               ) : (
                 <>
                   <div className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                     {formatUSD(usdBalance)}
                   </div>
                   <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                     {stats?.balance.toLocaleString()} {chainInfo?.symbol}
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Important Wallet Analytics (Replaces Charts) */}
        <div className="lg:col-span-2 glass rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-slide-up animation-delay-4000 relative overflow-hidden flex flex-col justify-center">
           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Wallet Analytics
           </h3>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 h-full">
              {/* Card 1: Tx Count */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between group hover:border-brand-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Transactions</span>
                     <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                     </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                     {loading ? '...' : stats?.txCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Lifetime transfers</div>
              </div>

              {/* Card 2: Status */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between group hover:border-brand-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activity Status</span>
                     <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                  </div>
                  {loading ? (
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">...</div>
                  ) : (
                    <div className="flex items-center gap-2">
                       <span className={`px-3 py-1 rounded-full text-sm font-bold ${typeof status === 'object' ? status.color : ''}`}>
                          {typeof status === 'object' ? status.text : status}
                       </span>
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">Based on recent activity</div>
              </div>

              {/* Card 3: Wallet Age */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between group hover:border-brand-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Wallet Age</span>
                     <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                     {loading ? '...' : calculateDaysActive()} <span className="text-lg font-bold text-slate-500">days</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                     First seen {stats?.firstTxDate ? new Date(stats.firstTxDate).toLocaleDateString() : '...'}
                  </div>
              </div>

               {/* Card 4: Last Seen */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between group hover:border-brand-500/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Seen</span>
                     <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                     {loading || !stats?.latestTransaction ? '...' : new Date(stats.latestTransaction.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                     {stats?.latestTransaction ? new Date(stats.latestTransaction.timestamp).toLocaleTimeString() : ''}
                  </div>
              </div>
           </div>
        </div>

        {/* Latest Transaction Card (Enhanced) */}
        <div className="glass rounded-[2rem] p-6 sm:p-8 shadow-xl animate-slide-up animation-delay-2000 flex flex-col">
           <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             Last Transaction
           </h3>

           {loading ? (
             <div className="animate-pulse space-y-4">
               <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
               <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
             </div>
           ) : stats?.latestTransaction ? (
             <div className="flex flex-col gap-6 h-full justify-start">
                {/* Header Block */}
                <div className="relative p-6 rounded-3xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-xl bg-white dark:bg-black p-1 shadow-md">
                           {stats.latestTransaction.token.logoUrl ? (
                             <img src={stats.latestTransaction.token.logoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                           ) : (
                             <div className="w-full h-full rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                               {stats.latestTransaction.token.symbol.substring(0,2)}
                             </div>
                           )}
                         </div>
                         <div>
                           <div className="text-sm font-bold text-slate-900 dark:text-white">
                             {stats.latestTransaction.token.name}
                           </div>
                           <div className="text-xs text-slate-500 font-mono">
                             {stats.latestTransaction.token.symbol}
                           </div>
                         </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${stats.latestTransaction.type === 'buy' || stats.latestTransaction.type === 'receive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {stats.latestTransaction.type}
                      </span>
                   </div>
                   
                   <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                     {formatUSD(stats.latestTransaction.amountUSD)}
                   </div>
                   <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                     {stats.latestTransaction.amount.toLocaleString(undefined, {maximumFractionDigits: 6})} {stats.latestTransaction.token.symbol}
                   </div>
                </div>

                {/* Details Block */}
                <div className="space-y-4">
                   {/* From / To */}
                   <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-3">
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">From</span>
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-300 break-all leading-tight">
                             {stats.latestTransaction.from ? maskAddress(stats.latestTransaction.from) : 'Unknown'}
                          </span>
                      </div>
                      <div className="flex justify-center text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">To</span>
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-300 break-all leading-tight">
                             {stats.latestTransaction.to ? maskAddress(stats.latestTransaction.to) : 'Unknown'}
                          </span>
                      </div>
                   </div>

                   {/* Time & Fee */}
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                         <span className="text-[10px] text-slate-500 uppercase font-bold">Time</span>
                         <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                             {new Date(stats.latestTransaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                         <span className="text-[10px] text-slate-500 uppercase font-bold">Network Fee</span>
                         <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                             {stats.latestTransaction.fee ? `${stats.latestTransaction.fee.toFixed(6)} ${chainInfo?.symbol}` : '-'}
                         </div>
                      </div>
                   </div>
                   
                   <div className="pt-2 text-center">
                      <a href={getExplorerLink(stats.latestTransaction.hash, profile!.chain)} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-mono text-brand-500 hover:text-brand-400 transition-colors">
                        View Transaction Hash
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                   </div>
                </div>
             </div>
           ) : (
             <div className="text-center text-slate-500 py-10">No recent activity found.</div>
           )}
        </div>
      </div>

      {/* Assets Section */}
      <div className="glass rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-slide-up animation-delay-4000">
        <div className="flex items-center justify-between mb-6">
          <div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Wallet Assets</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
               {profile?.chain === Blockchain.BTC 
                 ? "Native holdings" 
                 : "Tokenized assets found in wallet"}
             </p>
          </div>
          {profile?.chain !== Blockchain.BTC && stats?.tokens && stats.tokens.length > 0 && (
             <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
               {stats.tokens.length} Assets Found
             </span>
          )}
        </div>

        {profile?.chain === Blockchain.BTC ? (
          <div className="p-8 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
               <span className="font-bold text-orange-500">₿</span>
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-bold">Bitcoin Network</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Bitcoin does not support standard tokens. Only native BTC balance is available.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider pl-4">Asset</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                  <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-4">Value (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {!stats?.tokens || stats.tokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {loading ? "Scanning blockchain..." : "No additional tokens found."}
                    </td>
                  </tr>
                ) : (
                  stats.tokens.map((token, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-0.5">
                             {token.logoUrl ? (
                               <img src={token.logoUrl} alt={token.symbol} className="w-full h-full object-cover rounded-full" />
                             ) : (
                               token.symbol.substring(0, 3)
                             )}
                           </div>
                           <div>
                             <p className="font-bold text-slate-900 dark:text-white text-sm">{token.name}</p>
                             <div className="flex items-center gap-2">
                               <p className="text-xs text-slate-500 font-mono">{token.symbol}</p>
                               <button 
                                onClick={() => navigator.clipboard.writeText(token.contractAddress)}
                                className="text-[10px] text-slate-400 hover:text-brand-500 bg-slate-100 dark:bg-white/5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                Copy
                               </button>
                             </div>
                           </div>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {token.priceUSD ? formatUSD(token.priceUSD) : '-'}
                        </p>
                      </td>
                      <td className="py-4 text-right">
                        <p className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </p>
                      </td>
                      <td className="py-4 text-right pr-4">
                         <p className="font-bold text-slate-900 dark:text-white">
                           {token.valueUSD ? formatUSD(token.valueUSD) : '-'}
                         </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};