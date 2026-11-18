import React from 'react';

export default function BrandLogo({ size = 'default', showSubtitle = true, className = '' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const imgHeight = isLarge ? 'h-8 sm:h-10' : isSmall ? 'h-5 sm:h-6' : 'h-6 sm:h-7';

  return (
    <div className={`flex items-center select-none ${className}`}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {/* Official TheCarePal Logo */}
          <img
            src="/carepal-logo.png"
            alt="The CarePal"
            className={`${imgHeight} w-auto object-contain transition-transform duration-200 hover:scale-[1.02]`}
          />

          {/* MedSync Module Pill Badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wide shadow-2xs">
            MedSync
          </span>
        </div>

        {showSubtitle && !isSmall && (
          <span className="text-[11px] text-slate-500 font-semibold tracking-tight mt-0.5 pl-0.5">
            Trusted Care at Home
          </span>
        )}
      </div>
    </div>
  );
}
