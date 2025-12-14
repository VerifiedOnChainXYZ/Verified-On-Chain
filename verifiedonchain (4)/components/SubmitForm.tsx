import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Blockchain, SUPPORTED_CHAINS } from '../types';
import { storageService } from '../services/storage';
import { isValidAddress } from '../services/chain';
import { walletService, ConnectedWallet } from '../services/wallet';

type OnboardingStep = 'connect' | 'verify' | 'profile';
type ConnectionMode = 'wallet' | 'manual';

export const SubmitForm: React.FC = () => {
  const navigate = useNavigate();
  
  // Workflow State
  const [step, setStep] = useState<OnboardingStep>('connect');
  const [mode, setMode] = useState<ConnectionMode>('wallet');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detection State
  const [walletAvailability, setWalletAvailability] = useState({ evm: false, solana: false });

  // Data State
  const [formData, setFormData] = useState({
    username: '',
    address: '',
    chain: Blockchain.ETH,
    logoUrl: '',
    twitter: '',
    instagram: '',
    threads: '',
    reddit: ''
  });
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);

  // --- Real-time Detection ---
  useEffect(() => {
    const check = () => {
       setWalletAvailability(walletService.checkInstalled());
    };
    
    check();
    // Re-check after a moment in case of async injection
    const timer = setTimeout(check, 1000);
    return () => clearTimeout(timer);
  }, []);

  // --- Handlers: Wallet Connection ---

  const handleConnect = async (providerType: 'evm' | 'solana') => {
    setError(null);
    setIsLoading(true);
    try {
      let wallet: ConnectedWallet;
      if (providerType === 'evm') {
        wallet = await walletService.connectEVM();
      } else {
        wallet = await walletService.connectSolana();
      }
      
      setConnectedWallet(wallet);
      setFormData(prev => ({ ...prev, address: wallet.address, chain: wallet.chain }));
      setStep('verify');
    } catch (e: any) {
      setError(e.message || "Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOwnership = async () => {
    if (!connectedWallet) return;
    setError(null);
    setIsLoading(true);

    try {
      const message = walletService.createVerificationMessage(connectedWallet.address);
      let isValid = false;

      if (connectedWallet.chain === Blockchain.SOL) {
        isValid = await walletService.signSolana(connectedWallet.address, message);
      } else {
        isValid = await walletService.signEVM(connectedWallet.address, message);
      }

      if (isValid) {
        setStep('profile');
      } else {
        setError("Signature verification failed.");
      }
    } catch (e: any) {
      setError(e.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Manual Entry ---

  const handleManualNext = () => {
    setError(null);
    if (!isValidAddress(formData.address, formData.chain)) {
      setError(`Invalid ${formData.chain} address.`);
      return;
    }
    // Manual mode skips verification signature
    setConnectedWallet(null); // Ensure no wallet is linked
    setStep('profile');
  };

  // --- Handlers: Profile Submission ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setError("Image too large. Max 200KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!formData.username.match(/^[a-zA-Z0-9_]{3,20}$/)) {
        throw new Error("Username must be 3-20 alphanumeric characters.");
      }
      
      // Save to Supabase
      await storageService.createProfile({
        username: formData.username,
        address: formData.address,
        chain: formData.chain,
        logoUrl: formData.logoUrl || undefined,
        socials: {
          twitter: formData.twitter || undefined,
          instagram: formData.instagram || undefined,
          threads: formData.threads || undefined,
          reddit: formData.reddit || undefined
        }
      });

      navigate(`/u/${formData.username}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  // --- RENDER HELPERS ---

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      <div className={`flex flex-col items-center ${step === 'connect' ? 'text-brand-500' : 'text-slate-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${step === 'connect' ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>1</div>
        <span className="text-xs font-bold uppercase">Connect</span>
      </div>
      <div className={`flex-1 h-0.5 mx-4 ${step === 'verify' || step === 'profile' ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      <div className={`flex flex-col items-center ${step === 'verify' ? 'text-brand-500' : 'text-slate-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${step === 'verify' ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>2</div>
        <span className="text-xs font-bold uppercase">Verify</span>
      </div>
      <div className={`flex-1 h-0.5 mx-4 ${step === 'profile' ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      <div className={`flex flex-col items-center ${step === 'profile' ? 'text-brand-500' : 'text-slate-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${step === 'profile' ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>3</div>
        <span className="text-xs font-bold uppercase">Profile</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Claim Your Handle</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Create your verifiable on-chain identity.</p>
      </div>

      <div className="glass rounded-[2rem] p-8 md:p-10 shadow-2xl animate-slide-up relative overflow-hidden">
        
        {renderProgressBar()}

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-3 animate-pulse">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-semibold">{error}</span>
            </div>
        )}

        {/* --- STEP 1: CONNECTION --- */}
        {step === 'connect' && (
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
               <button onClick={() => setMode('wallet')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'wallet' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                 Connect Wallet
               </button>
               <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'manual' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                 Manual Entry
               </button>
            </div>

            {mode === 'wallet' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* EVM Wallet Option */}
                <button 
                  disabled={isLoading} 
                  onClick={() => handleConnect('evm')} 
                  className={`group p-4 rounded-xl border transition-all flex items-center gap-4 text-left relative overflow-hidden ${
                    walletAvailability.evm 
                      ? 'border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-slate-50 dark:hover:bg-slate-800' 
                      : 'border-slate-100 dark:border-slate-800 opacity-60'
                  }`}
                >
                   <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-slate-700 flex items-center justify-center text-orange-600">
                     <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.8l6.2 6.2L12 18.2 5.8 12 12 5.8z"/></svg> 
                   </div>
                   <div>
                     <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-500 flex items-center gap-2">
                       EVM Wallet
                       {walletAvailability.evm && (
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                       )}
                     </div>
                     <div className="text-xs text-slate-500">MetaMask, Trust, Rabby</div>
                     {!walletAvailability.evm && (
                        <div className="text-[10px] text-red-400 font-bold mt-1">Not Detected</div>
                     )}
                   </div>
                </button>

                {/* Solana Wallet Option */}
                <button 
                  disabled={isLoading} 
                  onClick={() => handleConnect('solana')} 
                  className={`group p-4 rounded-xl border transition-all flex items-center gap-4 text-left relative overflow-hidden ${
                    walletAvailability.solana
                      ? 'border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'border-slate-100 dark:border-slate-800 opacity-60'
                  }`}
                >
                   <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-slate-700 flex items-center justify-center text-purple-600">
                     <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                   </div>
                   <div>
                     <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-500 flex items-center gap-2">
                       Solana Wallet
                       {walletAvailability.solana && (
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                       )}
                     </div>
                     <div className="text-xs text-slate-500">Phantom, Backpack</div>
                     {!walletAvailability.solana && (
                        <div className="text-[10px] text-red-400 font-bold mt-1">Not Detected</div>
                     )}
                   </div>
                </button>

                 <button disabled={true} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed flex items-center gap-4 text-left sm:col-span-2">
                   <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-500">
                     <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                   </div>
                   <div>
                     <div className="font-bold text-slate-900 dark:text-white">WalletConnect</div>
                     <div className="text-xs text-slate-500">Universal Adapter (Coming Soon)</div>
                   </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                 <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Blockchain</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SUPPORTED_CHAINS.map((chain) => (
                      <button
                        key={chain.code}
                        type="button"
                        onClick={() => setFormData({...formData, chain: chain.code})}
                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                          formData.chain === chain.code
                            ? 'bg-white dark:bg-slate-800 border-brand-500 ring-1 ring-brand-500 text-brand-600'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-transparent text-slate-500 hover:bg-white'
                        }`}
                      >
                        {chain.symbol}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Wallet Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="Enter public address..."
                  />
                </div>
                <button 
                  onClick={handleManualNext}
                  className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Continue Manually
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: VERIFICATION (Wallet Mode Only) --- */}
        {step === 'verify' && connectedWallet && (
          <div className="text-center space-y-6 animate-slide-up">
            <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.956 11.956 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify Ownership</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Please sign a standardized message in your wallet to prove you own this address. This does not cost gas.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl font-mono text-xs text-slate-500 break-all border border-slate-200 dark:border-slate-700">
               {connectedWallet.address}
            </div>

            <button 
              onClick={handleVerifyOwnership} 
              disabled={isLoading}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                   <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Waiting for Signature...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Sign to Verify
                </>
              )}
            </button>
            
            <button onClick={() => setStep('connect')} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">
              Cancel
            </button>
          </div>
        )}

        {/* --- STEP 3: PROFILE DETAILS --- */}
        {step === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Claim Username</label>
              <div className="relative group">
                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">@</span>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-9 pr-4 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder-slate-400"
                  placeholder="satoshi"
                />
              </div>
            </div>

            {/* Locked Address Display */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
               <div className="mt-1">
                 {connectedWallet ? (
                   <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.956 11.956 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                 ) : (
                   <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 )}
               </div>
               <div className="flex-1 overflow-hidden">
                 <div className="text-xs font-bold uppercase text-slate-500 mb-0.5">Linked Address ({formData.chain})</div>
                 <div className="text-sm font-mono text-slate-900 dark:text-slate-300 truncate">{formData.address}</div>
                 {connectedWallet && <div className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">✓ Ownership Verified</div>}
               </div>
            </div>

            {/* Optional Details */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Details</h3>

               <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden relative group cursor-pointer transition-colors hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleImageUpload} />
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-bold text-slate-900 dark:text-white">Profile Picture</p>
                    <p className="text-sm text-slate-500">Supports PNG, JPG (Max 200KB)</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {['Twitter', 'Instagram', 'Threads', 'Reddit'].map((social) => (
                   <div key={social}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">{social}</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-3 text-slate-400 text-sm">@</span>
                        <input
                          type="text"
                          // @ts-ignore
                          value={formData[social.toLowerCase()]}
                          // @ts-ignore
                          onChange={e => setFormData({...formData, [social.toLowerCase()]: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-8 pr-4 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                          placeholder="username"
                        />
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoading ? 'Processing...' : 'Mint Profile'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};