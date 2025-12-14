import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../services/storage';
import { fetchWalletStats, maskAddress, getExchangeRate, formatUSD } from '../services/chain';
import { UserProfile, WalletStats, Blockchain, SUPPORTED_CHAINS, TimeRange } from '../types';

interface DashboardRow extends UserProfile {
  stats: WalletStats | null;
  loading: boolean;
  growth: number | null;
  usdBalance: number;
}

type SortOption = 'newest' | 'oldest' | 'balance' | 'growth';

const SortDropdown: React.FC<{ value: SortOption, onChange: (v: SortOption) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: 'Newest', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { value: 'balance', label: 'Top Wealth', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { value: 'growth', label: 'Top Growth', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
    { value: 'oldest', label: 'Oldest', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  const current = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="dashboard-sort-dropdown" className="relative w-full sm:w-auto" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl focus:outline-none transition-all w-full sm:w-[180px] justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400 group-hover:text-brand-500 transition-colors">{current?.icon}</span>
          <span className="font-medium">{current?.label}</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-brand-500/10 z-50 overflow-hidden animate-slide-up" style={{animationDuration: '0.2s'}}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                value === option.value 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                 {option.icon}
                 <span>{option.label}</span>
              </div>
              {value === option.value && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [performanceRange, setPerformanceRange] = useState<TimeRange>('30D');
  
  // Initial Load with Supabase (Async)
  useEffect(() => {
    const loadData = async () => {
      const profiles = await storageService.getAllProfiles();
      
      // Initialize rows
      const initialRows: DashboardRow[] = profiles.map(p => ({ 
        ...p, 
        stats: null, 
        loading: true,
        growth: null,
        usdBalance: 0
      }));
      setRows(initialRows);

      // Progressive loading of stats
      initialRows.forEach(row => {
        fetchWalletStats(row.address, row.chain).then(stats => {
          const rate = getExchangeRate(row.chain);
          const usdBalance = stats.balance * rate;
          // Growth calculated in useMemo now
          setRows(prev => prev.map(r => r.id === row.id ? { ...r, stats, usdBalance, loading: false } : r));
        });
      });
    };

    loadData();
  }, []);

  const processedRows = useMemo(() => {
    // 1. Calculate Growth based on selected Range
    const rowsWithGrowth = rows.map(row => {
      let growth = 0;
      if (row.stats && row.stats.history && row.stats.history.length > 0) {
        let days = 30;
        switch (performanceRange) {
           case '1D': days = 1; break;
           case '7D': days = 7; break;
           case '30D': days = 30; break;
           case '90D': days = 90; break;
           case '1Y': days = 365; break;
           case 'ALL': days = row.stats.history.length; break;
        }
        
        // Ensure we don't go out of bounds
        const startIndex = Math.max(0, row.stats.history.length - 1 - days);
        const startVal = row.stats.history[startIndex].value;
        const endVal = row.stats.history[row.stats.history.length - 1].value;
        
        if (startVal > 0) {
           growth = ((endVal - startVal) / startVal) * 100;
        }
      }
      return { ...row, growth };
    });

    // 2. Filter
    let result = rowsWithGrowth.filter(row => 
      row.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 3. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.createdAt - a.createdAt;
        case 'oldest': return a.createdAt - b.createdAt;
        case 'balance': return b.usdBalance - a.usdBalance;
        case 'growth':
          const grA = a.growth ?? -9999;
          const grB = b.growth ?? -9999;
          return grB - grA;
        default: return 0;
      }
    });

    return result;
  }, [rows, searchTerm, sortBy, performanceRange]);

  // Calculate Real Total Value
  const totalValue = useMemo(() => {
    return rows.reduce((acc, row) => acc + (row.usdBalance || 0), 0);
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Hero Section */}
      <div className="relative py-8 sm:py-12 md:py-20 flex flex-col items-center text-center animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-b from-transparent via-brand-500/5 to-transparent blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/10 border border-slate-200/50 dark:border-white/10 text-brand-600 dark:text-brand-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-6 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          Live Mainnet Data
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
          Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-500 to-indigo-500 animate-shimmer bg-[length:200%_auto] pr-4">OnChain</span>
        </h1>
        
        <p className="text-slate-600 dark:text-slate-300 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed mb-8 px-4">
          The definitive registry of verified blockchain identities. <br className="hidden md:block"/>
          Track wealth, history, and reputation across BTC, ETH, SOL, and BNB.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="glass px-6 py-3 rounded-2xl flex flex-col items-center min-w-[140px] sm:min-w-[160px]">
             <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Value</span>
             <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
               {totalValue > 0 ? formatUSD(totalValue) : <span className="animate-pulse">...</span>}
             </span>
          </div>
          <div className="glass px-6 py-3 rounded-2xl flex flex-col items-center min-w-[140px] sm:min-w-[160px]">
             <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Verified Users</span>
             <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{rows.length}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="sticky top-20 sm:top-24 z-30 mb-8 mx-auto max-w-4xl">
         <div className="glass p-2 rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/20 flex flex-col sm:flex-row gap-2 transition-all duration-300">
            <SortDropdown value={sortBy} onChange={setSortBy} />

            <div className="relative flex-grow group">
               <input
                 type="text"
                 placeholder="Search username or address..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-brand-500/30 text-slate-900 dark:text-slate-200 rounded-xl pl-11 pr-4 py-3 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500/50 focus:border-transparent outline-none transition-all placeholder-slate-400"
               />
               <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 group-focus-within:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
         </div>
      </div>

      {/* Table Section */}
      <div className="glass rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-900/5 mb-20 animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Profile</th>
                <th className="px-3 sm:px-6 py-4 sm:py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[100px] sm:w-[140px]">Chain</th>
                <th className="px-6 py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell w-[160px]">Address</th>
                <th className="px-3 sm:px-6 py-4 sm:py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-[120px] sm:w-[180px]">Balance</th>
                <th className="px-6 py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right hidden sm:table-cell w-[180px]">
                  <div className="flex items-center justify-end gap-2">
                     Performance
                     <select 
                       value={performanceRange}
                       onChange={(e) => setPerformanceRange(e.target.value as TimeRange)}
                       className="bg-slate-200 dark:bg-slate-800 rounded px-1 py-0.5 text-[10px] focus:outline-none cursor-pointer"
                     >
                       <option value="1D">1D</option>
                       <option value="7D">7D</option>
                       <option value="30D">30D</option>
                       <option value="90D">90D</option>
                       <option value="1Y">1Y</option>
                     </select>
                  </div>
                </th>
                <th className="px-8 py-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right hidden lg:table-cell w-[150px]">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {processedRows.length === 0 && !rows[0]?.loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <p className="text-lg font-medium">No profiles found matching "{searchTerm}"</p>
                      <button onClick={() => setSearchTerm('')} className="mt-4 text-brand-500 hover:text-brand-400 font-semibold text-sm transition-colors">Clear filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                processedRows.map((row, index) => {
                  const chainInfo = SUPPORTED_CHAINS.find(c => c.code === row.chain);
                  
                  return (
                    <tr 
                      key={row.id} 
                      className="group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 animate-slide-up hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      {/* User Column */}
                      <td className="px-4 sm:px-8 py-4 sm:py-5 whitespace-nowrap relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        <Link to={`/u/${row.username}`} className="flex items-center gap-3 sm:gap-4">
                          <div className="relative flex-shrink-0">
                            {/* Avatar */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 p-[2px] shadow-lg group-hover:shadow-brand-500/20 transition-all duration-300">
                                <div className="w-full h-full rounded-[14px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                  {row.logoUrl ? (
                                    <img src={row.logoUrl} alt={row.username} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                  ) : (
                                    <span className="text-base sm:text-lg font-bold text-slate-400 dark:text-slate-500">{row.username.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-500 group-hover:to-indigo-500 transition-all">
                              @{row.username}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden font-mono mt-0.5 opacity-60 truncate">
                              {maskAddress(row.address)}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Chain Column */}
                      <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700`}>
                              <span className={`text-[10px] font-bold ${chainInfo?.color}`}>{chainInfo?.symbol}</span>
                           </div>
                           <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden xl:inline truncate">{chainInfo?.name}</span>
                        </div>
                      </td>

                      {/* Address Column */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono hidden md:table-cell group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                        <span className="bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all">
                          {maskAddress(row.address)}
                        </span>
                      </td>

                      {/* Balance Column */}
                      <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-right">
                        {row.loading ? (
                          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"></div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                              {row.stats?.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              <span className="ml-1 text-slate-400 font-normal text-[10px] sm:text-xs">{chainInfo?.symbol}</span>
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                              ≈ {formatUSD(row.usdBalance)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Growth Column */}
                      <td className="px-6 py-5 whitespace-nowrap text-right hidden sm:table-cell">
                        {row.loading ? (
                           <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"></div>
                        ) : (
                           <div className="flex justify-end">
                             <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border w-fit ${
                               (row.growth || 0) >= 0 
                                 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                 : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                             }`}>
                               {(row.growth || 0) >= 0 ? (
                                 <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                               ) : (
                                 <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                               )}
                               {(row.growth || 0).toFixed(1)}%
                             </div>
                           </div>
                        )}
                      </td>

                      {/* Date Column */}
                      <td className="px-8 py-5 whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};