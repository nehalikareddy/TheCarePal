import React, { useState, useEffect } from 'react';
import { X, KeyRound, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function PairPatientModal({ isOpen, onClose, onPatientLinked, userRole }) {
  const [activeTab, setActiveTab] = useState(userRole === 'caretaker' ? 'join' : 'create');
  
  // Join form state
  const [careCode, setCareCode] = useState('');
  
  // Create form state
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [condition, setCondition] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default active tab to 'join' for caretakers and 'create' for family
  useEffect(() => {
    if (isOpen) {
      setActiveTab(userRole === 'caretaker' ? 'join' : 'create');
      setError('');
    }
  }, [isOpen, userRole]);

  if (!isOpen) return null;

  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!careCode || careCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit numeric Care Code');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/patients/join', { careCode: careCode.trim() });
      if (res.data?.pending) {
        onPatientLinked({
          ...res.data.patient,
          pending: true,
          message: 'Request sent to family! You will get access as soon as they approve.'
        });
      } else {
        onPatientLinked(res.data.patient);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to link patient with this Care Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setError('');
    if (!patientName || !patientAge) {
      setError('Patient name and age are required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/patients', {
        name: patientName.trim(),
        age: Number(patientAge),
        condition: condition.trim() || 'Home Care'
      });
      onPatientLinked(res.data.patient);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create patient profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101820]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#e6ecf1] max-h-[90vh] overflow-y-auto p-4 sm:p-6 mx-3 sm:mx-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="pb-4 border-b border-[#e6ecf1] flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3fb6ad]/15 text-[#04302c] flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#3fb6ad]" />
            </div>
            <h3 className="text-base font-bold text-[#101820] font-heading">
              {userRole === 'caretaker' ? 'Pair with Patient' : 'Patient Management'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers if family, or direct code input */}
        <div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-full mb-5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setActiveTab('join'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-full transition-all font-heading ${
                activeTab === 'join'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Enter 6-Digit Code
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-full transition-all font-heading ${
                activeTab === 'create'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create New Patient
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {activeTab === 'join' ? (
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">
                  6-Digit Patient Care Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={careCode}
                  onChange={(e) => setCareCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 482910"
                  className="w-full text-center tracking-widest font-mono text-xl py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Ask the family member or administrator for the patient's 6-digit Care Code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || careCode.length !== 6}
                className="w-full py-3 px-4 rounded-full text-xs sm:text-sm font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{loading ? 'Verifying...' : 'Link Patient'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">Age</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="e.g. 74"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">Medical Condition / Note</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Post-Stroke & Hypertension Care"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                A unique 6-digit Care Code will be automatically generated upon creation.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full text-xs sm:text-sm font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create & Generate Care Code'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
