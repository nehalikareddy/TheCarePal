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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Logo */}
        <div className="flex items-center shrink-0">
          <BrandLogo size="default" />
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* User Role Pill (replaced Live Sync) */}
          {user && (
            <div
              className={`h-9 inline-flex items-center justify-center px-3 sm:px-3.5 rounded-xl text-xs font-bold border shrink-0 font-heading ${
                user.role === 'family'
                  ? 'bg-blue-50 text-[#0074ff] border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <span>{user.role === 'family' ? 'Family' : 'Caretaker'}</span>
            </div>
          )}

          {/* User Profile Pill & Labeled Logout Button */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
              {/* Clickable Profile Pill */}
              <button
                type="button"
                onClick={onOpenProfile}
                className="h-9 inline-flex items-center gap-2 px-1.5 sm:px-2 rounded-xl hover:bg-slate-100 transition text-left cursor-pointer group"
                title="View & Edit Profile"
                aria-label="View & Edit Profile"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#3fb6ad]/20 text-[#04302c] font-bold text-xs flex items-center justify-center font-heading border border-[#3fb6ad]/40 shrink-0">
                    {getInitials(user.name)}
                  </div>
                )}
                <span className="hidden sm:inline text-xs sm:text-sm font-bold text-slate-800 font-heading group-hover:text-[#04302c] truncate max-w-[130px]">
                  {user.name}
                </span>
              </button>

              {/* Labeled Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="h-9 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shrink-0 active:scale-95"
                title="Logout / Switch Account"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="font-heading">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
