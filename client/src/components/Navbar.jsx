import React from 'react';
import BrandLogo from './BrandLogo';
import { LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout, isSocketConnected }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#e6ecf1] shadow-[0_1px_2px_rgba(15,26,34,0.04)]">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Logo */}
        <div className="flex items-center shrink-0">
          <BrandLogo size="default" />
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Real-time Socket Indicator (Compact Green Live Dot Badge) */}
          <div
            className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600"
            title={isSocketConnected ? 'Real-time WebSocket Live Sync Active' : 'Connecting to live socket...'}
          >
            <span className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="hidden md:inline ml-1.5 text-[11px] font-heading">
              {isSocketConnected ? 'Live Sync' : 'Connecting'}
            </span>
          </div>

          {/* User Name / Role Badge & Logout Button */}
          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-3 border-l border-slate-200">
              <div className="flex flex-col text-right">
                <span className="hidden sm:inline text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px] sm:max-w-none font-heading">
                  {user.name}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit sm:ml-auto font-heading ${
                  user.role === 'family'
                    ? 'bg-blue-50 text-[#0074ff] border border-blue-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {user.role === 'family' ? 'Family' : 'Caretaker'}
                </span>
              </div>

              {/* Logout Button (min-w-[44px] min-h-[44px]) */}
              <button
                onClick={onLogout}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                title="Logout / Switch Account"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
