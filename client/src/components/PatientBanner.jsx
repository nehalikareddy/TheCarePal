import React, { useState } from 'react';
import { UserCheck, Copy, Check, HeartHandshake, PlusCircle, ChevronDown } from 'lucide-react';

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
    <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-700/50 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Patient Profile Details */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <HeartHandshake className="w-6 h-6 text-teal-200" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-teal-300">
                Active Patient Profile
              </span>
              {patientsList.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1 text-[11px] bg-teal-700/60 hover:bg-teal-700 px-2 py-0.5 rounded-full border border-teal-500/50 text-teal-100 transition-colors"
                  >
                    <span>Switch</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 mt-1 w-56 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-20">
                      <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Linked Patients
                      </div>
                      {patientsList.map((p) => (
                        <button
                          key={p._id}
                          onClick={() => {
                            onSelectPatient(p);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-teal-50 flex items-center justify-between ${
                            p._id === patient._id ? 'font-bold text-teal-700 bg-teal-50/50' : 'text-slate-700'
                          }`}
                        >
                          <span>{p.name} ({p.age})</span>
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

            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
              {patient.name} <span className="text-teal-200 font-medium">({patient.age} yrs)</span>
            </h1>
            <p className="text-xs text-teal-100/90 mt-0.5 font-medium">
              Condition: <span className="text-white font-semibold">{patient.condition || 'Home Care Assistance'}</span>
            </p>
          </div>
        </div>

        {/* 1-Click Copyable 6-Digit Care Code Badge */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div className="bg-teal-950/60 backdrop-blur-sm border border-teal-500/30 rounded-xl p-2 sm:px-3 flex items-center gap-2.5">
            <div className="flex flex-col">
              <span className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
                Care Code
              </span>
              <span className="text-base font-mono font-extrabold tracking-widest text-teal-50">
                {patient.careCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`p-2 rounded-lg transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-700 hover:bg-teal-600 text-teal-100'
              }`}
              title="Click to copy Care Code for nurse or family sharing"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Caretaker "Link Another Patient" or Family "New Patient" button */}
          <button
            onClick={onOpenPairModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-teal-800/70 hover:bg-teal-700 text-teal-100 border border-teal-600/50 transition-colors"
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
