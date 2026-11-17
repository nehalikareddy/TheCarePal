import React from 'react';

export default function BrandLogo({ size = 'default', showSubtitle = true, className = '' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const iconDimension = isLarge ? 48 : isSmall ? 28 : 36;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon SVG: Shield / Heart with Coral Medical Cross */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={iconDimension}
          height={iconDimension}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200 hover:scale-105 drop-shadow-sm"
        >
          {/* Shield / Soft Heart Outer Contour */}
          <path
            d="M24 4L7 11.5V23.5C7 33.8 14.3 43.1 24 46C33.7 43.1 41 33.8 41 23.5V11.5L24 4Z"
            fill="#F0FDFA"
            stroke="#0D9488"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Inner Teal Wave / Heart Arc */}
          <path
            d="M14 22C14 17.5 18 16 21 18.5L24 21L27 18.5C30 16 34 17.5 34 22C34 28 26.5 33 24 35C21.5 33 14 28 14 22Z"
            fill="#CCFBF1"
            fillOpacity="0.7"
          />
          {/* Empathetic Medical Cross in Warm Coral (#E07A5F) */}
          <rect x="21.5" y="16" width="5" height="15" rx="2" fill="#E07A5F" />
          <rect x="16.5" y="21" width="15" height="5" rx="2" fill="#E07A5F" />
        </svg>
      </div>

      {/* Brand Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`tracking-tight ${isLarge ? 'text-2xl' : isSmall ? 'text-lg' : 'text-xl'}`}>
            <span className="text-slate-800 font-medium">The</span>
            <span className="text-teal-700 font-extrabold">Care</span>
            <span className="text-[#E07A5F] font-extrabold">Pal</span>
          </span>
          {/* MedSync Pill Badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wide shadow-xs">
            MedSync
          </span>
        </div>
        {showSubtitle && !isSmall && (
          <span className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
            Trusted Care at Home • Peace of Mind
          </span>
        )}
      </div>
    </div>
  );
}
