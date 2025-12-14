import React, { useState, useEffect, useCallback } from 'react';

interface Step {
  targetId?: string; // ID of the element to highlight
  title: string;
  description: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
}

export const TourGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const steps: Step[] = [
    {
      title: "Welcome to VerifiedOnChain",
      description: "The definitive source for verified blockchain identities. Let's take a quick tour.",
      // No target for welcome step, shows in center
    },
    {
      targetId: "nav-verify-btn",
      title: "Get Verified",
      description: "Click here to link your BTC, ETH, SOL, or BNB wallet. It's read-only and establishes your on-chain reputation.",
      position: 'bottom'
    },
    {
      targetId: "dashboard-sort-dropdown",
      title: "Smart Filtering",
      description: "Use this dropdown to sort profiles by Wealth, Growth, or Recency.",
      position: 'bottom'
    }
  ];

  const currentStep = steps[stepIndex];

  const updatePosition = useCallback(() => {
    if (currentStep.targetId) {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null); // Fallback if element not found
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep.targetId]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [updatePosition, stepIndex]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
    }
  };

  // Determine styles for the highlight box with smooth bezier curve
  const highlightStyle: React.CSSProperties = targetRect ? {
    top: targetRect.top - 8,
    left: targetRect.left - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
    position: 'fixed',
    zIndex: 60,
    borderRadius: '12px',
    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75), 0 0 50px rgba(56, 189, 248, 0.4)',
    border: '2px solid rgba(56, 189, 248, 0.8)',
    // MUCH SLOWER AND CALMER TRANSITION
    transition: 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)', 
    pointerEvents: 'none'
  } : {};

  // Determine styles for the popover box
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Center if no target
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70,
        width: '90%',
        maxWidth: '320px',
        // MUCH SLOWER AND CALMER TRANSITION
        transition: 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)'
      };
    }

    // Simple positioning logic
    let top = targetRect.bottom + 24;
    let left = targetRect.left + (targetRect.width / 2) - 160; // Center horiz relative to target (assuming width 320px)

    // Keep within viewport logic for mobile
    const viewportWidth = window.innerWidth;
    
    if (left < 10) left = 10;
    if (left + 320 > viewportWidth) left = viewportWidth - 330;

    // Check if bottom overflow, flip to top if needed (basic check)
    if (top + 200 > window.innerHeight) {
       top = targetRect.top - 200;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 70,
      width: '320px',
      maxWidth: 'calc(100vw - 20px)',
      // MUCH SLOWER AND CALMER TRANSITION
      transition: 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  };

  return (
    <>
      {/* If no target, simple overlay */}
      {!targetRect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-1000 ease-in-out" />
      )}

      {/* Spotlight Box */}
      <div style={targetRect ? highlightStyle : { display: 'none' }} />

      {/* Popover */}
      <div 
        style={getPopoverStyle()} 
        className="glass rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-float"
      >
        {targetRect && (
          // Arrow pointing up
          <div className="hidden sm:block absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 dark:bg-slate-800/80 border-t border-l border-slate-200 dark:border-slate-700 transform rotate-45 backdrop-blur-md" />
        )}

        <div className="transition-all duration-700" key={stepIndex}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{currentStep.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-1">
             {steps.map((_, i) => (
               <div key={i} className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${i === stepIndex ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
             ))}
          </div>
          <button
            onClick={handleNext}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-500/25 transition-all duration-300 transform active:scale-95"
          >
            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
};