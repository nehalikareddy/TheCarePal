import React from 'react';
import BrandLogo from './BrandLogo';
import { LogOut } from 'lucide-react';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

export default function Navbar({ user, onLogout, isSocketConnected, onOpenProfile }) {
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
            <span
              className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden md:inline ml-1.5 text-[11px] font-heading">
              {isSocketConnected ? 'Live Sync' : 'Connecting'}
            </span>
          </div>

          {/* User Profile Pill & Labeled Logout Button */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-3 border-l border-slate-200">
              {/* Clickable Profile Pill */}
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-slate-100 transition text-left cursor-pointer group"
                title="View & Edit Profile"
                aria-label="View & Edit Profile"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#3fb6ad]/20 text-[#04302c] font-bold text-xs flex items-center justify-center font-heading border border-[#3fb6ad]/40 shrink-0">
                    {getInitials(user.name)}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="hidden sm:inline text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px] font-heading group-hover:text-[#04302c]">
                    {user.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full w-fit font-heading ${
                      user.role === 'family'
                        ? 'bg-blue-50 text-[#0074ff] border border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {user.role === 'family' ? 'FAMILY' : 'CARETAKER'}
                  </span>
                </div>
              </button>

              {/* Labeled Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shrink-0 active:scale-95"
                title="Logout / Switch Account"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="font-heading">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
