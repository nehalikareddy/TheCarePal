import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Copy,
  Check,
  PlusCircle,
  Users,
  RefreshCw,
  UserMinus,
  UserCheck,
  Shield,
  X,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import api from '../services/api';
import EditPatientModal from './EditPatientModal';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

export default function PatientBanner({
  patient,
  patientsList = [],
  onSelectPatient,
  onOpenPairModal,
  userRole,
  onPatientUpdated,
  onBackToProfiles,
  onEditPatient,
}) {
  const [copied, setCopied] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);

  // Care Team Modal State
  const [isCareTeamOpen, setIsCareTeamOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamMessage, setTeamMessage] = useState({ text: '', type: 'info' });

  // Load team members and pending approvals for family
  useEffect(() => {
    if (!patient?._id || userRole !== 'family') return;
    api.get(`/patients/${patient._id}/members`)
      .then((res) => {
        setMembers(res.data.members || []);
        setPendingMembers(res.data.pendingMembers || []);
      })
      .catch(() => {});
  }, [patient?._id, userRole]);

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
      setPendingMembers(res.data.pendingMembers || []);
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

  const handleApprovePending = async (userId, memberName) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/patients/${patient._id}/requests/${userId}/approve`);
      setMembers(res.data.members || []);
      setPendingMembers(res.data.pendingMembers || []);
      setTeamMessage({ text: `Approved ${memberName} to join care team.`, type: 'success' });
    } catch (err) {
      setTeamMessage({
        text: err.response?.data?.message || 'Failed to approve request',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPending = async (userId, memberName) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/patients/${patient._id}/requests/${userId}/reject`);
      setMembers(res.data.members || []);
      setPendingMembers(res.data.pendingMembers || []);
      setTeamMessage({ text: `Declined request for ${memberName}.`, type: 'info' });
    } catch (err) {
      setTeamMessage({
        text: err.response?.data?.message || 'Failed to reject request',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
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
    <div className="mb-6">
      {/* Clean Breadcrumb Link directly above PatientBanner */}
      <div className="mb-2.5">
        <button
          type="button"
          onClick={onBackToProfiles || (() => onSelectPatient && onSelectPatient(null))}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors font-heading group cursor-pointer"
          title="Return to Select Profile screen"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
          <span>Back to All Profiles</span>
        </button>
      </div>

      {/* Main Patient Banner Card */}
      <div className="bg-[#101820] text-white rounded-2xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.16)] border border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Patient Profile Details */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
              {patient.profilePicture ? (
                <img
                  src={patient.profilePicture}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading font-extrabold text-[#3fb6ad] text-lg">
                  {getInitials(patient.name)}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading flex items-center gap-2 flex-wrap">
                <span>{patient.name}</span>
                <span className="text-slate-400 font-normal text-sm sm:text-base">({patient.age} yrs)</span>
              </h1>

              <div className="flex flex-col gap-0.5 mt-2 text-xs sm:text-[13px] text-slate-300 font-medium">
                <div>
                  Condition: <span className="text-white font-semibold">{patient.condition || 'Home Care Assistance'}</span>
                </div>
                {patient.emergencyContact && (
                  <div>
                    Emergency: <span className="text-emerald-300 font-semibold">{patient.emergencyContact}</span>
                  </div>
                )}
                {patient.address && (
                  <div>
                    Location: <span className="text-slate-200">{patient.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1-Click Copyable 6-Digit Care Code & Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/15 rounded-full hover:bg-white/10 transition-all min-h-[44px] text-left group active:scale-[0.98]"
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

            {/* Edit Profile Button (Family only) */}
            {userRole === 'family' && (
              <button
                type="button"
                onClick={() => {
                  if (onEditPatient) onEditPatient(patient);
                  else setIsEditPatientOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 font-heading min-h-[44px] active:scale-[0.98]"
                title="Edit Patient Details"
              >
                <Pencil className="w-3.5 h-3.5 text-[#3fb6ad] shrink-0" />
                <span>Edit Profile</span>
              </button>
            )}

            {/* Family-only Care Team Management Button */}
            {userRole === 'family' && (
              <button
                type="button"
                onClick={handleOpenCareTeam}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 font-heading min-h-[44px] active:scale-[0.98] relative"
                title="Manage linked caregivers & security"
              >
                <Users className="w-4 h-4 text-[#3fb6ad] shrink-0" />
                <span>Care Team</span>
                {pendingMembers.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 font-heading animate-pulse">
                    {pendingMembers.length}
                  </span>
                )}
              </button>
            )}

            {/* Add / Enter Code Pill Button */}
            <button
              onClick={onOpenPairModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] transition-all shadow-[0_4px_14px_rgba(63,182,173,0.25)] font-heading min-h-[44px] active:scale-[0.98]"
              title="Link another patient using a 6-digit Care Code"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{userRole === 'caretaker' ? 'Enter Code' : 'Add Patient'}</span>
            </button>
          </div>
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

            {/* Pending Caregiver Approval Requests */}
            {pendingMembers.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 font-heading">
                    Pending Approval Requests ({pendingMembers.length})
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {pendingMembers.map((reqItem) => (
                    <div
                      key={reqItem.userId || reqItem._id}
                      className="p-3 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {reqItem.profilePicture ? (
                          <img
                            src={reqItem.profilePicture}
                            alt={reqItem.name}
                            className="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center font-heading border border-amber-300 shrink-0">
                            {getInitials(reqItem.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 font-heading truncate">
                              {reqItem.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-heading bg-amber-100 text-amber-900">
                              {reqItem.role || 'caregiver'}
                            </span>
                            {reqItem.qualification && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-heading bg-teal-50 text-teal-800 border border-teal-200">
                                {reqItem.qualification}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span>{reqItem.email}</span>
                            {reqItem.age && <span>• {reqItem.age} yrs {reqItem.sex && `(${reqItem.sex})`}</span>}
                            {reqItem.address && <span>• {reqItem.address}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApprovePending(reqItem.userId || reqItem._id, reqItem.name)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all min-h-[38px] font-heading shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectPending(reqItem.userId || reqItem._id, reqItem.name)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all min-h-[38px] font-heading"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                        <div className="flex items-center gap-3 min-w-0">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#3fb6ad]/20 text-[#04302c] font-bold text-xs flex items-center justify-center font-heading border border-[#3fb6ad]/40 shrink-0">
                              {getInitials(member.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 font-heading truncate">
                                {member.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                                  isFamily
                                    ? 'bg-[#3fb6ad]/15 text-[#04302c] border border-[#3fb6ad]/30'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isFamily ? 'Family Admin' : 'Caregiver'}
                              </span>
                              {member.qualification && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-heading bg-teal-50 text-teal-800 border border-teal-200">
                                  {member.qualification}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span>{member.email}</span>
                              {member.age && <span>• {member.age} yrs {member.sex && `(${member.sex})`}</span>}
                              {member.address && <span>• {member.address}</span>}
                            </div>
                          </div>
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

      {/* Edit Patient Details Modal */}
      <EditPatientModal
        isOpen={isEditPatientOpen}
        onClose={() => setIsEditPatientOpen(false)}
        patient={patient}
        onPatientUpdated={(updated) => {
          if (onPatientUpdated) onPatientUpdated(updated);
          setIsEditPatientOpen(false);
        }}
      />
    </div>
  );
}
