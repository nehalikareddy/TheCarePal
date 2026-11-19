import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Plus,
  Clock,
  Pill,
  XCircle,
  Trash2,
  Eye,
  X,
  UploadCloud,
  FileText,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import HandoverNotesPanel from './HandoverNotesPanel';

export default function FamilyView({ patient, user }) {
  const [adherenceData, setAdherenceData] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' (Adherence default) | 'medicines' | 'handovers'
  const [lightboxRx, setLightboxRx] = useState(null);

  // Form State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    strength: '',
    dose: '1 tablet',
    times: '08:00',
    food: 'after',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    currentStock: 30,
    lowStockThresholdDays: 3,
    prescriptionUrl: ''
  });
  const [rxUploading, setRxUploading] = useState(false);
  const [rxError, setRxError] = useState('');
  const [submittingMed, setSubmittingMed] = useState(false);
  const [medError, setMedError] = useState('');

  const fetchFamilyData = async () => {
    if (!patient) {
      setLoading(false);
      return;
    }
    try {
      const [adhRes, medRes] = await Promise.all([
        api.get(`/adherence/weekly/${patient._id}`),
        api.get(`/medicines/patient/${patient._id}`)
      ]);
      setAdherenceData(adhRes.data);
      setMedicines(medRes.data.medicines || []);
    } catch (err) {
      console.error('Failed to load family dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
  }, [patient]);

  const handleRxFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRxError('');

    // Validate size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setRxError('Prescription image must be 5MB or smaller.');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'carepal_prescriptions';

    if (!cloudName) {
      setRxError('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME in client/.env to enable direct photo uploads.');
      return;
    }

    setRxUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: data
      });

      const json = await res.json();
      if (json.secure_url) {
        setFormData((prev) => ({ ...prev, prescriptionUrl: json.secure_url }));
      } else {
        setRxError(json.error?.message || 'Failed to upload prescription image');
      }
    } catch (err) {
      console.error('Prescription upload error:', err);
      setRxError('Network error uploading prescription image to Cloudinary');
    } finally {
      setRxUploading(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    setMedError('');
    if (!formData.name || !formData.strength || !formData.dose) {
      setMedError('Please complete all required fields');
      return;
    }

    const timesArray = formData.times
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

    if (timesArray.length === 0) {
      setMedError('Please provide valid times in HH:mm format separated by commas (e.g. 08:00, 20:00)');
      return;
    }

    setSubmittingMed(true);
    try {
      await api.post('/medicines', {
        ...formData,
        patientId: patient._id,
        times: timesArray,
        currentStock: Number(formData.currentStock),
        lowStockThresholdDays: Number(formData.lowStockThresholdDays),
        prescriptionUrl: formData.prescriptionUrl || ''
      });

      setIsAddFormOpen(false);
      setFormData({
        name: '',
        strength: '',
        dose: '1 tablet',
        times: '08:00',
        food: 'after',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        currentStock: 30,
        lowStockThresholdDays: 3,
        prescriptionUrl: ''
      });
      setRxError('');
      await fetchFamilyData();
    } catch (err) {
      setMedError(err.response?.data?.message || 'Failed to save medicine');
    } finally {
      setSubmittingMed(false);
    }
  };

  const handleDeleteMedicine = async (medId) => {
    if (!confirm('Are you sure you want to remove this medicine?')) return;
    try {
      await api.delete(`/medicines/${medId}`);
      await fetchFamilyData();
    } catch (err) {
      alert('Failed to delete medicine');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500 flex flex-col items-center">
        <div className="w-8 h-8 border-3 border-[#3fb6ad] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold font-heading">Loading family adherence data...</p>
      </div>
    );
  }

  const totalSlots =
    adherenceData?.totalSlots ??
    adherenceData?.totalScheduled ??
    adherenceData?.summary?.totalScheduled ??
    0;

  const rawRate =
    adherenceData?.adherenceRate !== undefined && adherenceData?.adherenceRate !== null
      ? adherenceData.adherenceRate
      : adherenceData?.adherencePercentage !== undefined && adherenceData?.adherencePercentage !== null
      ? adherenceData.adherencePercentage
      : null;

  const hasScheduledDoses = totalSlots > 0 && rawRate !== null;
  const weeklyRate = hasScheduledDoses ? Math.round(rawRate) : null;
  const lowStockAlerts = adherenceData?.lowStockAlerts || [];
  const skippedFeed = adherenceData?.skippedFeed || adherenceData?.skippedDosesFeed || [];
  const dailyTrends = adherenceData?.dailyStats || adherenceData?.dailyTrends || [];

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs & Add Medicine Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6ecf1] pb-3">
        {/* Full-width equal 3-column tab bar on mobile: Adherence -> Meds -> Handovers */}
        <div className="grid grid-cols-3 sm:flex w-full sm:w-auto gap-1 p-1 bg-slate-100 rounded-full text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full sm:w-auto px-2 sm:px-4 py-2 min-h-[42px] sm:min-h-[40px] rounded-full text-[11px] sm:text-xs font-bold transition-all font-heading text-center truncate ${
              activeTab === 'overview'
                ? 'bg-[#101820] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Adherence
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`w-full sm:w-auto px-2 sm:px-4 py-2 min-h-[42px] sm:min-h-[40px] rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 font-heading text-center truncate ${
              activeTab === 'medicines'
                ? 'bg-[#101820] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Meds ({medicines.length})</span>
            {lowStockAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('handovers')}
            className={`w-full sm:w-auto px-2 sm:px-4 py-2 min-h-[42px] sm:min-h-[40px] rounded-full text-[11px] sm:text-xs font-bold transition-all font-heading text-center truncate ${
              activeTab === 'handovers'
                ? 'bg-[#101820] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Handovers
          </button>
        </div>

        {/* Quick Action: Add Medicine full-width primary button on mobile */}
        <button
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] transition-all shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] font-heading active:scale-[0.98] w-full sm:w-auto min-h-[46px]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-[0_2px_8px_rgba(217,119,6,0.08)]">
          <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-800 mt-0.5 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-amber-900 font-heading">
              Low Stock Warning: Refill Needed
            </h4>
            <div className="mt-1 space-y-1">
              {lowStockAlerts.map((item) => (
                <div key={item.id || item.medicineId} className="text-xs text-amber-800 flex items-center justify-between">
                  <span>
                    • <strong className="font-semibold">{item.name} ({item.strength})</strong>: Only {item.currentStock} units remaining (runs out in ~{item.daysRemaining} days)
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200 px-2.5 py-0.5 rounded-full font-heading">
                    Refill Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Inline Form */}
      {isAddFormOpen && (
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#3fb6ad]/40 shadow-[0_2px_8px_rgba(0,0,0,0.06)] animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto mx-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#101820] font-heading">Add New Prescribed Medication</h3>
            <button
              onClick={() => setIsAddFormOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              ✕ Close
            </button>
          </div>

          {medError && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
              {medError}
            </div>
          )}

          <form onSubmit={handleCreateMedicine} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Medicine Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pantoprazole"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Strength</label>
              <input
                type="text"
                required
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="e.g. 40mg"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Dose Unit</label>
              <input
                type="text"
                required
                value={formData.dose}
                onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                placeholder="e.g. 1 tablet"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Scheduled Times (HH:mm, comma-separated)</label>
              <input
                type="text"
                required
                value={formData.times}
                onChange={(e) => setFormData({ ...formData, times: e.target.value })}
                placeholder="e.g. 08:00, 20:00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Food Timing</label>
              <select
                value={formData.food}
                onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              >
                <option value="after">After Food</option>
                <option value="before">Before Food</option>
                <option value="any">Anytime / Not dependent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Current Stock (units)</label>
              <input
                type="number"
                min={0}
                required
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 font-heading">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:outline-none"
              />
            </div>

            {/* Prescription Photo Upload (Cloudinary) */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1 font-heading">
                Prescription Photo (Optional)
              </label>
              <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                {!formData.prescriptionUrl ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all shadow-xs min-h-[44px]">
                      {rxUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#3fb6ad]" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-[#3fb6ad]" />
                      )}
                      <span>{rxUploading ? 'Uploading to Cloudinary...' : 'Upload Prescription Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={rxUploading}
                        onChange={handleRxFileSelect}
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">
                      JPG, PNG or WEBP up to 5MB. Takes photo with mobile camera or selects from gallery.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={formData.prescriptionUrl}
                        alt="Prescription preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 font-heading block truncate">
                          Prescription Photo Attached
                        </span>
                        <span className="text-[11px] text-emerald-600 font-medium">Ready to save with medicine</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, prescriptionUrl: '' }))}
                      className="p-1.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {rxError && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    {rxError}
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="py-2 px-4 rounded-full text-slate-600 bg-slate-100 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingMed}
                className="py-2 px-5 rounded-full text-[#04302c] bg-[#3fb6ad] font-bold hover:bg-[#37a79e] shadow-[0_4px_14px_rgba(63,182,173,0.3)] font-heading"
              >
                {submittingMed ? 'Saving...' : 'Add Medicine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Adherence Hero Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e6ecf1]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              {/* Adherence Progress Ring & Score */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-24 h-24 sm:w-28 sm:h-28 transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke="#E2E8F0"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke={
                        !hasScheduledDoses
                          ? '#CBD5E1'
                          : weeklyRate >= 85
                          ? '#3fb6ad'
                          : weeklyRate >= 70
                          ? '#D97706'
                          : '#DC2626'
                      }
                      strokeWidth="10"
                      strokeDasharray={289}
                      strokeDashoffset={hasScheduledDoses ? 289 - (289 * weeklyRate) / 100 : 289}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl sm:text-2xl font-extrabold text-[#101820] tracking-tight font-heading">
                      {hasScheduledDoses ? `${weeklyRate}%` : '--'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-heading">Adherence</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#3fb6ad]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
                      7-Day Adherence Score
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101820] mt-0.5 font-heading">
                    {!hasScheduledDoses
                      ? 'No Doses Scheduled Yet'
                      : weeklyRate >= 90
                      ? 'Excellent Medication Routine'
                      : weeklyRate >= 75
                      ? 'Good Routine Adherence'
                      : 'Needs Immediate Attention'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto sm:mx-0">
                    {!hasScheduledDoses
                      ? 'Add medicines to start tracking 7-day adherence and daily trends.'
                      : weeklyRate >= 90
                      ? 'The patient has successfully taken prescribed medications on time with minimal skips.'
                      : 'Review the skipped doses log below to address patient refusal or scheduling gaps.'}
                  </p>
                </div>
              </div>

              {/* Weekly Quick Metrics */}
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-2.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-heading">Given Doses</span>
                  <div className="text-base font-extrabold text-[#3fb6ad] font-heading">
                    {adherenceData?.totalGiven ?? adherenceData?.summary?.totalGiven ?? 0}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-heading">Skipped Doses</span>
                  <div className="text-base font-extrabold text-red-600 font-heading">
                    {adherenceData?.totalSkipped ?? adherenceData?.summary?.totalSkipped ?? 0}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-heading">Total Slots</span>
                  <div className="text-base font-extrabold text-[#101820] font-heading">
                    {adherenceData?.totalScheduled ?? adherenceData?.summary?.totalScheduled ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Day Completion Bar Chart */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 font-heading">
                Daily Completion Trends (Past 7 Days)
              </h4>

              <div className="grid grid-cols-7 gap-1 sm:gap-3 text-center overflow-x-hidden">
                {dailyTrends.map((day) => {
                  const dayTotal = day.total ?? day.scheduled ?? day.dayTotal ?? 0;
                  const dayRate =
                    day.rate !== undefined && day.rate !== null
                      ? day.rate
                      : day.adherenceRate !== undefined && day.adherenceRate !== null
                      ? day.adherenceRate
                      : null;
                  const hasDayDoses = dayTotal > 0 && dayRate !== null;

                  const rate = hasDayDoses ? Math.round(dayRate) : null;
                  const heightPct = hasDayDoses ? Math.max(15, rate) : 0;
                  const isHealthy = hasDayDoses && rate >= 85;
                  const isModerate = hasDayDoses && rate >= 70 && rate < 85;

                  return (
                    <div key={day.date} className="flex flex-col items-center min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 font-heading">
                        {hasDayDoses ? `${rate}%` : '—'}
                      </span>

                      {/* Bar Container */}
                      <div className="w-full bg-slate-100 h-20 sm:h-24 rounded-lg sm:rounded-xl p-0.5 sm:p-1 flex flex-col justify-end">
                        {hasDayDoses ? (
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-md sm:rounded-lg transition-all duration-500 ${
                              isHealthy
                                ? 'bg-[#3fb6ad]'
                                : isModerate
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            title={`${day.dayName || day.label}: ${day.given || 0}/${dayTotal} doses given`}
                          />
                        ) : (
                          <div
                            className="w-full h-1 bg-slate-200/60 rounded-full"
                            title={`${day.dayName || day.label}: No scheduled doses`}
                          />
                        )}
                      </div>

                      <span className="text-[10px] sm:text-xs font-bold text-[#101820] mt-1.5 sm:mt-2 font-heading truncate w-full">{day.dayName || day.label?.split(',')[0]}</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate w-full">{day.displayDate || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Skipped Doses Feed */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e6ecf1]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm sm:text-base font-bold text-[#101820] font-heading">
                  Skipped Doses Feed & Caregiver Observations
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-heading">
                {skippedFeed.length} recorded {skippedFeed.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {skippedFeed.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No skipped doses in the last 7 days. Excellent adherence!
              </p>
            ) : (
              <div className="space-y-3">
                {skippedFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-red-50/40 border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm font-heading">
                            {item.medicineName} {item.strength ? `(${item.strength})` : ''}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {item.scheduledDate} at {item.scheduledTime}
                          </span>
                        </div>
                        <p className="text-red-900 font-medium mt-1 leading-snug">
                          Reason: <span className="font-bold text-red-950">"{item.reasonText}"</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[11px] text-slate-500 shrink-0">
                      <div>Logged by <strong className="text-slate-700">{item.caregiver || item.loggedBy}</strong></div>
                      <div>{item.loggedAt ? new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicines Catalog Tab */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e6ecf1]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#101820] font-heading">Prescribed Medicines</h3>
              <p className="text-xs text-slate-500">Active medications, daily schedules and inventory tracking</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {medicines.map((med) => {
              const dailyCount = med.times ? med.times.length : 1;
              const daysLeft = Math.floor(med.currentStock / dailyCount);
              const isLow = daysLeft <= (med.lowStockThresholdDays || 3);

              return (
                <div
                  key={med._id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isLow ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-[#e6ecf1] hover:border-[#3fb6ad]/40 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[#101820] font-heading">{med.name}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {med.strength}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteMedicine(med._id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Dose: {med.dose} • {med.food === 'before' ? 'Before food' : med.food === 'after' ? 'After food' : 'Anytime'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {med.times.map((t) => (
                        <span key={t} className="px-2.5 py-0.5 rounded-full bg-[#3fb6ad]/10 border border-[#3fb6ad]/30 text-[#04302c] text-[11px] font-mono font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        Stock: <strong className="text-slate-800 font-bold">{med.currentStock} units</strong>
                      </span>
                      {med.prescriptionUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxRx({
                              url: med.prescriptionUrl,
                              name: med.name,
                              strength: med.strength,
                              dose: med.dose
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#3fb6ad]/15 text-[#04302c] hover:bg-[#3fb6ad]/25 transition-all min-h-[38px] font-heading border border-[#3fb6ad]/30"
                          title="View attached doctor's prescription"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#3fb6ad]" />
                          <span>View Prescription</span>
                        </button>
                      )}
                    </div>
                    <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] font-heading shrink-0 ${
                      isLow ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {isLow ? `Runs out in ~${daysLeft} days` : `~${daysLeft} days supply`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Handover Tab */}
      {activeTab === 'handovers' && (
        <HandoverNotesPanel patientId={patient._id} userRole="family" />
      )}

      {/* Full-Screen Prescription Lightbox Modal */}
      {lightboxRx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#101820] font-heading flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3fb6ad]" />
                  <span>Prescription: {lightboxRx.name} ({lightboxRx.strength})</span>
                </h3>
                <p className="text-xs text-slate-500">Doctor's original prescription document</p>
              </div>
              <button
                onClick={() => setLightboxRx(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 min-w-[38px] min-h-[38px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-900/5 min-h-[240px]">
              <img
                src={lightboxRx.url}
                alt={`Prescription for ${lightboxRx.name}`}
                className="max-h-[60vh] w-auto object-contain rounded-xl shadow-sm"
              />
            </div>

            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <a
                href={lightboxRx.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-slate-600 hover:text-[#04302c] underline min-h-[38px] flex items-center"
              >
                Open Full Image ↗
              </a>
              <button
                type="button"
                onClick={() => setLightboxRx(null)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading min-h-[38px]"
              >
                Close Lightbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
