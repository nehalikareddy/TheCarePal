import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { Bell, LogOut, Radio, CheckCircle2 } from 'lucide-react';
import { sendBrowserNotification, playNotificationChime } from '../utils/notifications';

export default function Navbar({ user, onLogout, isSocketConnected, onRefresh }) {
  const [toastMessage, setToastMessage] = useState(null);

  const handleTestReminder = () => {
    playNotificationChime();
    const title = 'Medication Reminder: Pantoprazole (40mg)';
    const body = 'Scheduled at 07:30 (Before Breakfast) for Ramesh Verma. Please administer on time.';

    sendBrowserNotification(title, {
      body,
      tag: 'test-reminder',
    });

    setToastMessage({
      title: 'Reminder Fired!',
      description: 'Browser notification sent & audio chime played.',
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-[#e6ecf1] shadow-[0_1px_2px_rgba(15,26,34,0.04)]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo */}
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
              <span className="hidden md:inline ml-1.5 text-[11px] font-heading">{isSocketConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Notification Bell Button (min-w-[44px] min-h-[44px]) */}
            <button
              onClick={handleTestReminder}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] px-2 sm:px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#3fb6ad]/15 text-[#04302c] border border-[#3fb6ad]/50 hover:bg-[#3fb6ad] hover:text-[#04302c] hover:shadow-[0_4px_14px_rgba(63,182,173,0.3)] transition-all active:scale-95 font-heading"
              title="Medication Reminder Alerts"
              aria-label="Medication Reminder Alerts"
            >
              <Bell className="w-4 h-4 text-[#04302c]" />
              <span className="hidden md:inline ml-1.5">Alerts</span>
            </button>

            {/* User Pill & Role Badge */}
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

      {/* In-app Toast Banner for Reminder Confirmation */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#101820] text-white p-4 rounded-2xl shadow-xl flex items-start gap-3 border border-slate-700 max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#3fb6ad] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white font-heading">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toastMessage.description}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
