import React, { useState } from 'react';
import { X, Sparkles, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const SAMPLE_AI_JSON = {
  name: "Amlodipine",
  strength: "5mg",
  dose: "1 tablet",
  times: ["08:00"],
  food: "after",
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  currentStock: 30,
  lowStockThresholdDays: 5,
  prescriptionImageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=60"
};

export default function ImportPrescriptionModal({ isOpen, onClose, patientId, onImportSuccess }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_AI_JSON, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedPreview, setParsedPreview] = useState(SAMPLE_AI_JSON);

  if (!isOpen) return null;

  const handleJsonChange = (e) => {
    const val = e.target.value;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setParsedPreview(parsed);
      setError('');
    } catch (err) {
      setParsedPreview(null);
      setError('Invalid JSON syntax: ' + err.message);
    }
  };

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_AI_JSON, null, 2));
    setParsedPreview(SAMPLE_AI_JSON);
    setError('');
  };

  const handleImport = async () => {
    setError('');
    if (!parsedPreview) {
      setError('Please provide valid JSON matching the schema');
      return;
    }

    if (!parsedPreview.name || !parsedPreview.strength || !parsedPreview.dose || !parsedPreview.times) {
      setError('Missing required medicine fields (name, strength, dose, times)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...parsedPreview,
        patientId,
      };

      const res = await api.post('/medicines', payload);
      onImportSuccess(res.data.medicine);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import medicine from JSON');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
          <div className="flex items-center gap-2 text-teal-800">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">
              Import AI Prescription JSON
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-600 mb-3">
            Paste prescription metadata extracted by an AI OCR model matching TheCarePal prescription JSON schema:
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              JSON Input
            </span>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Load Sample AI Payload</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={9}
              value={jsonText}
              onChange={handleJsonChange}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50 text-slate-800 leading-relaxed"
            />
          </div>

          {error && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preview Card */}
          {parsedPreview && !error && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Valid Payload: {parsedPreview.name} ({parsedPreview.strength})</span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px]">
                {parsedPreview.dose} • Times: {Array.isArray(parsedPreview.times) ? parsedPreview.times.join(', ') : parsedPreview.times} • Stock: {parsedPreview.currentStock} units
              </p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !parsedPreview || !!error}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Importing...' : 'Save & Import Medicine'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
