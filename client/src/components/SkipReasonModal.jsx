import React, { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';

const QUICK_CHIPS = [
  'Patient Asleep',
  'Refused Medicine',
  'Fasting for Lab Test',
  'Nausea / Upset Stomach',
  'Away from Home / Outing',
  'Doctor Advised to Hold'
];

export default function SkipReasonModal({ isOpen, dose, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !dose) return null;

  const handleChipClick = (chip) => {
    setReason(chip);
    setError('');
  };

  const handleConfirm = () => {
    if (!reason || !reason.trim()) {
      setError('A reason is strictly required to skip this medication.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101820]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#e6ecf1] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e6ecf1] flex items-center justify-between bg-rose-50/60">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-[#101820] font-heading">
              Record Reason for Skipping
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Dose Info Context */}
          <div className="bg-slate-50 border border-[#e6ecf1] rounded-2xl p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#101820] font-heading">{dose.name} ({dose.strength})</span>
              <span className="text-xs font-semibold text-slate-500 font-mono">{dose.scheduledTime}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dose: {dose.dose} • {dose.food === 'before' ? 'Before food' : dose.food === 'after' ? 'After food' : 'Anytime'}
            </p>
          </div>

          {/* Quick 1-Tap Chips */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#101820] mb-2 font-heading">
              1-Tap Quick Reasons
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => {
                const isSelected = reason === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-200 shadow-xs'
                        : 'bg-white text-slate-600 border-[#e6ecf1] hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{chip}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Text Area */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">
              Custom Caregiver Note / Clinical Reason
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="Provide exact context for the family (e.g. Patient felt dizzy, waiting for doctor consultation)..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold mb-3">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors font-heading"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !reason.trim()}
              className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm font-heading active:scale-[0.98]"
            >
              {loading ? 'Recording...' : 'Confirm Skip'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
