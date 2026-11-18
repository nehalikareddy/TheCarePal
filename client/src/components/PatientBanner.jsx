import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Copy,
  Check,
  PlusCircle,
  ChevronDown,
  Users,
  RefreshCw,
  UserMinus,
  Shield,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function PatientBanner({
  patient,
  patientsList = [],
  onSelectPatient,
  onOpenPairModal,
  userRole,
  onPatientUpdated
}) {
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Care Team Modal State
  const [isCareTeamOpen, setIsCareTeamOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamMessage, setTeamMessage] = useState({ text: '', type: 'info' });

  if (!patient) return null;

  const handleCopyCode = () => {
    if (patient.careCode) {
      navigator.clipboard.writeText(patient.careCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    setTeamMessage({ text: '', type: 'info' });
    try {
      const res = await api.get(`/patients/${patient._id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error('Failed to fetch care team members:', err);
      setTeamMessage({ text: 'Failed to load team members.', type: 'error' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenCareTeam = () => {
    setIsCareTeamOpen(true);
    fetchMembers();
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to revoke access for ${memberName}? They will immediately lose access to this patient.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/patients/${patient._id}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
      setTeamMessage({ text: `Revoked access for ${memberName}.`, type: 'success' });
    } catch (err) {
      setTeamMessage({
        text: err.response?.data?.message || 'Failed to remove member.',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateCode = async () => {
    if (
      !confirm(
        `Are you sure you want to generate a new Care Code? The current code (${patient.careCode}) will immediately stop working for new joins.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/patients/${patient._id}/rotate-code`);
      if (res.data?.patient) {
        if (onPatientUpdated) {
          onPatientUpdated(res.data.patient);
        }
        setTeamMessage({
          text: `New Care Code generated: ${res.data.patient.careCode}`,
          type: 'success'
        });
      }
    } catch (err) {
      setTeamMessage({
        text: err.response?.data?.message || 'Failed to rotate Care Code.',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
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

        {/* 1-Click Copyable 6-Digit Care Code & Action Buttons */}
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto items-stretch sm:items-center">
          <button
            type="button"
            onClick={handleCopyCode}
            className={`${
              userRole === 'family' ? 'col-span-2 sm:col-span-1' : 'col-span-1'
            } flex items-center justify-between px-3 py-2 bg-white/5 border border-white/15 rounded-full hover:bg-white/10 transition-all min-h-[44px] text-left group active:scale-[0.98]`}
            title="Click to copy Care Code for nurse or family sharing"
          >
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-heading leading-none">
                Care Code
              </span>
              <span className="text-sm sm:text-base font-mono font-extrabold tracking-widest text-[#3fb6ad] leading-tight">
                {patient.careCode}
              </span>
            </div>

            <div
              className={`p-1.5 rounded-full shrink-0 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-white group-hover:bg-white/20'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Family-only Care Team Management Button */}
          {userRole === 'family' && (
            <button
              type="button"
              onClick={handleOpenCareTeam}
              className="col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 font-heading min-h-[44px] active:scale-[0.98]"
              title="Manage linked caregivers & security"
            >
              <Users className="w-4 h-4 text-[#3fb6ad] shrink-0" />
              <span>Care Team</span>
            </button>
          )}

          {/* Add / Enter Code Pill Button */}
          <button
            onClick={onOpenPairModal}
            className={`${
              userRole === 'family' ? 'col-span-1' : 'col-span-1'
            } flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] transition-all shadow-[0_4px_14px_rgba(63,182,173,0.25)] font-heading min-h-[44px] active:scale-[0.98]`}
            title="Link another patient using a 6-digit Care Code"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{userRole === 'caretaker' ? 'Enter Code' : 'Add Patient'}</span>
          </button>
        </div>
      </div>

      {/* Care Team & Security Modal */}
      {isCareTeamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white text-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#3fb6ad]/15 text-[#04302c]">
                  <Shield className="w-5 h-5 text-[#3fb6ad]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101820] font-heading">
                    Care Team & Access
                  </h3>
                  <p className="text-xs text-slate-500">
                    Linked caregivers for {patient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCareTeamOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message */}
            {teamMessage.text && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  teamMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{teamMessage.text}</span>
              </div>
            )}

            {/* Linked Members List */}
            <div className="mt-4 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-heading">
                Active Team Members ({members.length})
              </h4>

              {loadingMembers ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                  <div className="w-6 h-6 border-2 border-[#3fb6ad] border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs font-heading">Loading team...</span>
                </div>
              ) : members.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No linked members found.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {members.map((member) => {
                    const isFamily = member.role === 'family';
                    return (
                      <div
                        key={member._id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-heading truncate">
                              {member.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                                isFamily
                                  ? 'bg-[#3fb6ad]/15 text-[#04302c] border border-[#3fb6ad]/30'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {isFamily ? 'Family Admin' : 'Caregiver'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {member.email}
                          </span>
                        </div>

                        {!isFamily && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member._id, member.name)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 active:scale-95 transition-all min-h-[38px] shrink-0 font-heading"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Care Code Rotation Section */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading block">
                      Current Care Code
                    </span>
                    <span className="text-base font-mono font-extrabold text-[#101820] tracking-widest">
                      {patient.careCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRotateCode}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#101820] text-white hover:bg-slate-800 transition-all font-heading min-h-[44px] active:scale-95 shadow-sm"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#3fb6ad] ${
                        actionLoading ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Rotate Code</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2.5">
                  <strong>Security Note:</strong> Regenerating the 6-digit Care Code will invalidate the current code ({patient.careCode}). Existing connected caregivers remain connected, but any new caregiver will need the newly generated code to link.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCareTeamOpen(false)}
                className="px-5 py-2 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all font-heading min-h-[38px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
