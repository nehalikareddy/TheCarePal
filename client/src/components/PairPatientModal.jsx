import React, { useState } from 'react';
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
      onPatientLinked(res.data.patient);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">
              {userRole === 'caretaker' ? 'Pair with Patient' : 'Patient Management'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers if family, or direct code input */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setActiveTab('join'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'join'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Enter 6-Digit Code
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Create New Patient
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {activeTab === 'join' ? (
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6-Digit Patient Care Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={careCode}
                  onChange={(e) => setCareCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 482910"
                  className="w-full text-center tracking-widest font-mono text-xl py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Ask the family member or administrator for the patient's 6-digit Care Code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || careCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Verifying...' : 'Link Patient'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="e.g. 74"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medical Condition / Note</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g. Post-Stroke & Hypertension Care"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                A unique 6-digit Care Code will be automatically generated upon creation.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
