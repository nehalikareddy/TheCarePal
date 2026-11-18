import React from 'react';
import {
  HeartHandshake,
  PlusCircle,
  Clock,
  ArrowRight,
  Shield,
  UserCheck,
  User,
  Sparkles,
} from 'lucide-react';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';
}

export default function SelectProfileView({
  user,
  patients = [],
  pendingApprovals = [],
  onSelectPatient,
  onOpenPairModal,
  onOpenProfile,
}) {
  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
      {/* Top Greeting & User Profile Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2 py-0.5 rounded-full font-heading">
              {user?.role === 'family' ? 'Family Administrator' : 'Caretaker / Nurse'}
            </span>
            {user?.qualification && (
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-heading">
                {user.qualification}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-1 tracking-tight">
            Welcome back, {user?.name || 'Caregiver'}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a patient profile to manage medication schedules, logs, and adherence.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold font-heading shadow-xs transition active:scale-95 shrink-0 self-start sm:self-center"
        >
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-[#3fb6ad]" />
          )}
          <span>Edit My Profile</span>
        </button>
      </div>

      {/* Patient Cards Grid */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Linked Patients ({patients.length})
          </h2>
          <button
            type="button"
            onClick={onOpenPairModal}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#04302c] hover:underline font-heading"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{user?.role === 'family' ? '+ Add Patient' : '+ Link via Care Code'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Active Linked Patients */}
          {patients.map((pat) => (
            <div
              key={pat._id}
              onClick={() => onSelectPatient(pat)}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_10px_rgba(15,26,34,0.04)] hover:shadow-[0_8px_24px_rgba(15,26,34,0.08)] hover:border-[#3fb6ad] transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#3fb6ad]/15 text-[#04302c] flex items-center justify-center font-bold text-base font-heading border border-[#3fb6ad]/30 group-hover:scale-105 transition-transform">
                    {getInitials(pat.name)}
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                    Code: {pat.careCode}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-[#04302c] transition-colors">
                  {pat.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {pat.age} years old
                </p>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-heading">
                    Condition
                  </span>
                  <span className="text-slate-700 font-semibold truncate block mt-0.5">
                    {pat.condition || 'General Home Care'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold font-heading text-[#04302c]">
                <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Open Care Dashboard &rarr;
                </span>
                <div className="w-7 h-7 rounded-full bg-[#3fb6ad]/10 flex items-center justify-center text-[#04302c] group-hover:bg-[#3fb6ad] transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Pending Approval Patients (Caretakers) */}
          {pendingApprovals.map((pending) => (
            <div
              key={pending._id}
              className="bg-amber-50/60 rounded-3xl p-5 border-2 border-amber-300/80 shadow-xs flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base font-heading border border-amber-300">
                    {getInitials(pending.name)}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-heading">
                    <Clock className="w-3 h-3" />
                    <span>Pending Approval</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-amber-950 font-heading">
                  {pending.name}
                </h3>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  Care Code submitted • Awaiting Family Review
                </p>

                <div className="mt-3 p-2.5 rounded-xl bg-white/70 border border-amber-200/80 text-xs text-amber-900">
                  <p className="text-[11px] leading-relaxed">
                    Request sent to family administrator. Records and schedules unlock automatically as soon as approved.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold text-amber-800">
                <span className="font-heading">Auto-Syncing Status...</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
            </div>
          ))}

          {/* "+ Add / Link Patient" Dashed Card */}
          <button
            type="button"
            onClick={onOpenPairModal}
            className="rounded-3xl p-6 border-2 border-dashed border-slate-300 hover:border-[#3fb6ad] hover:bg-[#3fb6ad]/5 transition-all text-center flex flex-col items-center justify-center min-h-[200px] cursor-pointer group active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-[#3fb6ad]/20 text-slate-500 group-hover:text-[#04302c] flex items-center justify-center transition-colors mb-3">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 font-heading group-hover:text-[#04302c]">
              {user?.role === 'family' ? '+ Add New Patient' : '+ Link Patient via Care Code'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              {user?.role === 'family'
                ? 'Create a new patient profile with medicines and dosage rules.'
                : 'Enter a 6-digit Care Code from the patient family to request access.'}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
