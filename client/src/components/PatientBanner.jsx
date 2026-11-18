import React, { useState } from 'react';
import { HeartHandshake, Copy, Check, PlusCircle, ChevronDown } from 'lucide-react';

export default function PatientBanner({
  patient,
  patientsList = [],
  onSelectPatient,
  onOpenPairModal,
  userRole
}) {
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!patient) return null;

  const handleCopyCode = () => {
    if (patient.careCode) {
      navigator.clipboard.writeText(patient.careCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#101820] text-white rounded-2xl p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-700/60 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Patient Profile Details */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <HeartHandshake className="w-6 h-6 text-[#3fb6ad]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#3fb6ad] font-heading">
                Active Patient Profile
              </span>
              {patientsList.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20 text-slate-200 transition-colors"
                  >
                    <span>Switch</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20">
                      <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 font-heading">
                        Linked Patients
                      </div>
                      {patientsList.map((p) => (
                        <button
                          key={p._id}
                          onClick={() => {
                            onSelectPatient(p);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#3fb6ad]/10 flex items-center justify-between transition-colors ${
                            p._id === patient._id ? 'font-bold text-[#04302c] bg-[#3fb6ad]/15' : 'text-slate-700'
                          }`}
                        >
                          <span className="font-heading">{p.name} ({p.age})</span>
                          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {p.careCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5 font-heading">
              {patient.name} <span className="text-slate-400 font-normal">({patient.age} yrs)</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Condition: <span className="text-white font-semibold">{patient.condition || 'Home Care Assistance'}</span>
            </p>
          </div>
        </div>

        {/* 1-Click Copyable 6-Digit Care Code Badge */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <div className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">
                Care Code
              </span>
              <span className="text-base font-mono font-extrabold tracking-widest text-[#3fb6ad]">
                {patient.careCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`p-1.5 rounded-lg transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Click to copy Care Code for nurse or family sharing"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Add / Enter Code Pill Button */}
          <button
            onClick={onOpenPairModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] transition-all shadow-[0_4px_14px_rgba(63,182,173,0.25)] font-heading"
            title="Link another patient using a 6-digit Care Code"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{userRole === 'caretaker' ? 'Enter Code' : 'Add Patient'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
