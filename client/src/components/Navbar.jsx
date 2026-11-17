import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { Bell, LogOut, User, RefreshCw, Radio, CheckCircle2 } from 'lucide-react';
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
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <BrandLogo size="default" />
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Socket Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 text-slate-600"
              title={isSocketConnected ? 'Real-time WebSocket Live Sync Active' : 'Connecting to live socket...'}
            >
              <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-semibold">{isSocketConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Test Reminder Button */}
            <button
              onClick={handleTestReminder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-xs active:scale-95"
              title="Test Browser Push Notification & Audio Chime"
            >
              <Bell className="w-3.5 h-3.5 text-teal-700 animate-bounce" />
              <span className="hidden xs:inline">Test Reminder</span>
            </button>

            {/* User Pill & Role Badge */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px] sm:max-w-none">
                    {user.name}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded-md w-fit ml-auto mt-0.5 ${
                    user.role === 'family'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {user.role === 'family' ? 'Family' : 'Caretaker'}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Logout / Switch Account"
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
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl flex items-start gap-3 border border-slate-700 max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">{toastMessage.title}</h4>
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
