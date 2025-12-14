import React, { useState, useEffect } from 'react';

export const OnboardingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay for animation entrance
    const timer = setTimeout(() => setIsOpen(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 500); // Wait for transition to finish
  };

  const steps = [
    {
      title: "Welcome to VerifiedOnChain",
      description: "The definitive source for verified blockchain identities. Explore public wallets with rich, real-time analytics.",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    },
    {
      title: "Verify Your Wallet",
      description: "Claim your username by linking a BTC, ETH, SOL, or BNB wallet. It's read-only, secure, and establishes your on-chain reputation.",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .667.333 1 1 1v1m0-2c0 .667-.333 1-1 1v1m-6 4h2m4 0h2m-4 4h2" />
          </svg>
        </div>
      )
    },
    {
      title: "Analyze & Track",
      description: "Use our advanced dashboard to filter by wealth, activity, or growth. View detailed historical charts for any verified profile.",
      icon: (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
      )
    }
  ];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-all duration-500 ease-in-out ${isOpen ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
      <div 
        className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
      >
        
        <div className="flex flex-col items-center text-center">
          <div className="transition-all duration-300 transform key={step}">
            {steps[step].icon}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {steps[step].title}
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            {steps[step].description}
          </p>

          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i === step ? 'w-8 bg-brand-500' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all transform active:scale-95"
            >
              {step === steps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};