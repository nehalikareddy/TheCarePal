import React, { useState, useEffect } from 'react';
import {
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  XCircle,
  Clock,
  Pill,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import SkipReasonModal from './SkipReasonModal';
import HandoverNotesPanel from './HandoverNotesPanel';

export default function CaretakerView({ patient, user }) {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Skip modal state
  const [selectedDoseForSkip, setSelectedDoseForSkip] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchTodaySchedule = async () => {
    if (!patient) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/schedule/today/${patient._id}`);
      setScheduleData(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError('Unable to load today schedule. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySchedule();
  }, [patient]);

  // Handle Mark Given
  const handleMarkGiven = async (dose) => {
    if (dose.status === 'given') return; // Locked against double-dosing
    setSubmittingAction(true);
    setActionSuccessMessage('');

    try {
      const todayStr = scheduleData.date;
      await api.post('/doses/log', {
        patientId: patient._id,
        medicineId: dose.medicineId,
        scheduledDate: todayStr,
        scheduledTime: dose.scheduledTime,
        status: 'given',
        reasonText: '',
      });

      await fetchTodaySchedule();
      setActionSuccessMessage(`Marked ${dose.name} as GIVEN.`);

      if (scheduleData && scheduleData.summary?.pending === 1) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      }

      setTimeout(() => setActionSuccessMessage(''), 3500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record dose as given.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Mark Skipped Confirm
  const handleConfirmSkip = async (reasonText) => {
    if (!selectedDoseForSkip) return;
    setSubmittingAction(true);

    try {
      const todayStr = scheduleData.date;
      await api.post('/doses/log', {
        patientId: patient._id,
        medicineId: selectedDoseForSkip.medicineId,
        scheduledDate: todayStr,
        scheduledTime: selectedDoseForSkip.scheduledTime,
        status: 'skipped',
        reasonText,
      });

      setSelectedDoseForSkip(null);
      await fetchTodaySchedule();
      setActionSuccessMessage(`Recorded ${selectedDoseForSkip.name} as SKIPPED (${reasonText}).`);
      setTimeout(() => setActionSuccessMessage(''), 3500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record skipped dose.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500 flex flex-col items-center">
        <div className="w-8 h-8 border-3 border-[#3fb6ad] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold font-heading">Loading daily medication schedule...</p>
      </div>
    );
  }

  const doses = scheduleData?.doses || scheduleData?.slots || [];
  const morningDoses = doses.filter((d) => (d.slot || d.bucket) === 'Morning');
  const afternoonDoses = doses.filter((d) => (d.slot || d.bucket) === 'Afternoon');
  const nightDoses = doses.filter((d) => (d.slot || d.bucket) === 'Night');

  const summary = scheduleData?.summary || { total: 0, given: 0, skipped: 0, pending: 0 };

  const renderSlotSection = (title, slotDoses, icon, badgeColor) => {
    if (slotDoses.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-1.5 rounded-lg ${badgeColor}`}>
            {icon}
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-[#101820] uppercase tracking-wider font-heading">
            {title} ({slotDoses.length})
          </h2>
        </div>

        <div className="space-y-3">
          {slotDoses.map((dose) => {
            const isGiven = dose.status === 'given';
            const isSkipped = dose.status === 'skipped';
            const isPending = dose.status === 'pending';
            const logInfo = dose.log || (dose.status !== 'pending' ? dose : null);

            return (
              <div
                key={dose.doseId || `${dose.medicineId}_${dose.scheduledTime}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isGiven
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isSkipped
                    ? 'bg-red-50/30 border-red-200'
                    : 'bg-white border-[#e6ecf1] hover:border-[#3fb6ad]/40 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Medicine Details */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isGiven
                          ? 'bg-emerald-100 text-emerald-700'
                          : isSkipped
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[#3fb6ad]/10 text-[#04302c] border border-[#3fb6ad]/30'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#101820] leading-tight font-heading">
                          {dose.name}
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {dose.strength}
                        </span>

                        {/* Food instruction tag */}
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            dose.food === 'before'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-[#3fb6ad]/15 text-[#04302c]'
                          }`}
                        >
                          {dose.food === 'before' ? 'Before Food' : dose.food === 'after' ? 'After Food' : 'With / without food'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="font-semibold flex items-center gap-1 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-[#3fb6ad]" />
                          <span>{dose.scheduledTime}</span>
                        </span>
                        <span>•</span>
                        <span>Dose: {dose.dose}</span>
                        <span>•</span>
                        <span className={dose.isLowStock ? 'text-amber-700 font-bold flex items-center gap-1' : ''}>
                          {dose.isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />}
                          Stock: {dose.currentStock} {dose.isLowStock && `(Low: ${dose.daysRemaining} days left)`}
                        </span>
                      </div>

                      {/* Log details if logged */}
                      {logInfo && (
                        <div className="mt-2 text-xs flex items-center gap-2">
                          {isGiven && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Given at {logInfo.loggedAt ? new Date(logInfo.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dose.scheduledTime} by {logInfo.loggedBy || 'Caregiver'}
                              </span>
                            </span>
                          )}
                          {isSkipped && (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100/80 px-2.5 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Skipped: "{logInfo.reasonText}" (by {logInfo.loggedBy || 'Caregiver'})</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Minimum 44px tall buttons for mobile usability */}
                  <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
                    {isPending ? (
                      <>
                        {/* 44px+ Given Button */}
                        <button
                          type="button"
                          onClick={() => handleMarkGiven(dose)}
                          disabled={submittingAction}
                          className="flex-1 sm:flex-none min-h-[44px] py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 font-heading"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Given</span>
                        </button>

                        {/* 44px+ Skipped Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedDoseForSkip(dose)}
                          disabled={submittingAction}
                          className="flex-1 sm:flex-none min-h-[44px] py-2.5 px-5 rounded-full text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 font-heading"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Skipped</span>
                        </button>
                      </>
                    ) : (
                      /* Double-dose Prevention Locked Badge */
                      <div className="flex items-center gap-2 py-2 px-3 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Locked (Recorded)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Confirmation Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in font-heading">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Daily Progress Overview Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e6ecf1] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">Total Doses</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#101820] mt-1 font-heading">{summary.total}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col bg-emerald-50/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-heading">Given</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-heading">{summary.given}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col bg-amber-50/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-heading">Pending</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1 font-heading">{summary.pending}</span>
        </div>
      </div>

      {/* Schedule Grouped Sections */}
      <div>
        {renderSlotSection(
          'Morning (05:00 – 11:59)',
          morningDoses,
          <Sun className="w-4 h-4 text-amber-600" />,
          'bg-amber-100'
        )}

        {renderSlotSection(
          'Afternoon (12:00 – 16:59)',
          afternoonDoses,
          <Sunset className="w-4 h-4 text-orange-600" />,
          'bg-orange-100'
        )}

        {renderSlotSection(
          'Night (17:00 – 23:59)',
          nightDoses,
          <Moon className="w-4 h-4 text-indigo-600" />,
          'bg-indigo-100'
        )}

        {doses.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold font-heading">No active medications scheduled for today.</p>
          </div>
        )}
      </div>

      {/* Handover Notes Module */}
      <HandoverNotesPanel patientId={patient._id} userRole="caretaker" />

      {/* Skip Reason Modal */}
      <SkipReasonModal
        isOpen={!!selectedDoseForSkip}
        dose={selectedDoseForSkip}
        onClose={() => setSelectedDoseForSkip(null)}
        onConfirm={handleConfirmSkip}
        loading={submittingAction}
      />
    </div>
  );
}
