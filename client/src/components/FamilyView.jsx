import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  FileText,
  Plus,
  Calendar,
  Clock,
  Pill,
  User,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  ChevronRight,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import HandoverNotesPanel from './HandoverNotesPanel';

export default function FamilyView({ patient, user }) {
  const [adherenceData, setAdherenceData] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'medicines' | 'handovers'

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
    prescriptionImageUrl: ''
  });
  const [submittingMed, setSubmittingMed] = useState(false);
  const [medError, setMedError] = useState('');

  const fetchFamilyData = async () => {
    if (!patient) return;
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
        lowStockThresholdDays: Number(formData.lowStockThresholdDays)
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
        prescriptionImageUrl: ''
      });
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
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Loading family adherence data & prescription analytics...</p>
      </div>
    );
  }

  const weeklyRate = adherenceData?.weeklyAdherence ?? 0;
  const lowStockAlerts = adherenceData?.lowStockAlerts || [];
  const skippedFeed = adherenceData?.skippedDosesFeed || [];
  const dailyTrends = adherenceData?.dailyTrends || [];

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Adherence & Analytics
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'medicines'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            <span>Medicines ({medicines.length})</span>
            {lowStockAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('handovers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'handovers'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Shift Handovers
          </button>
        </div>

        {/* Quick Action: Add Medicine */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
          <div className="p-1.5 bg-amber-200/80 rounded-xl text-amber-800 mt-0.5 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-amber-900">
              Low Stock Warning: Refill Needed
            </h4>
            <div className="mt-1 space-y-1">
              {lowStockAlerts.map((item) => (
                <div key={item.id} className="text-xs text-amber-800 flex items-center justify-between">
                  <span>
                    • <strong className="font-semibold">{item.name} ({item.strength})</strong>: Only {item.currentStock} units remaining (runs out in ~{item.daysRemaining} days)
                  </span>
                  <span className="text-[11px] font-bold bg-amber-200 px-2 py-0.5 rounded-full">
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
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-teal-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Add New Prescribed Medication</h3>
            <button
              onClick={() => setIsAddFormOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
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
              <label className="block font-bold text-slate-700 mb-1">Medicine Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pantoprazole"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Strength</label>
              <input
                type="text"
                required
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="e.g. 40mg"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Dose Unit</label>
              <input
                type="text"
                required
                value={formData.dose}
                onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                placeholder="e.g. 1 tablet"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Scheduled Times (HH:mm, comma-separated)</label>
              <input
                type="text"
                required
                value={formData.times}
                onChange={(e) => setFormData({ ...formData, times: e.target.value })}
                placeholder="e.g. 08:00, 20:00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Food Timing</label>
              <select
                value={formData.food}
                onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="after">After Food</option>
                <option value="before">Before Food</option>
                <option value="any">Anytime / Not dependent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Stock (units)</label>
              <input
                type="number"
                min={0}
                required
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="py-2 px-4 rounded-xl text-slate-600 bg-slate-100 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingMed}
                className="py-2 px-5 rounded-xl text-white bg-teal-600 font-bold hover:bg-teal-700 shadow-xs"
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              
              {/* Adherence Progress Ring & Score */}
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center">
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
                      stroke={weeklyRate >= 85 ? '#16A34A' : weeklyRate >= 70 ? '#D97706' : '#DC2626'}
                      strokeWidth="10"
                      strokeDasharray={289}
                      strokeDashoffset={289 - (289 * weeklyRate) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                      {weeklyRate}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Adherence</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      7-Day Adherence Score
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {weeklyRate >= 90 ? 'Excellent Medication Compliance' : weeklyRate >= 75 ? 'Good Routine Adherence' : 'Needs Immediate Attention'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {weeklyRate >= 90
                      ? 'The patient has successfully taken prescribed medications on time with minimal skips.'
                      : 'Review the skipped doses log below to address patient refusal or scheduling gaps.'}
                  </p>
                </div>
              </div>

              {/* Weekly Quick Metrics */}
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-2.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Given Doses</span>
                  <div className="text-base font-extrabold text-emerald-600">
                    {adherenceData?.summary?.totalGiven || 0}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Skipped Doses</span>
                  <div className="text-base font-extrabold text-red-600">
                    {adherenceData?.summary?.totalSkipped || 0}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Today</span>
                  <div className="text-base font-extrabold text-amber-600">
                    {adherenceData?.summary?.totalPending || 0}
                  </div>
                </div>
              </div>

            </div>

            {/* 7-Day Completion Bar Chart */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Daily Completion Trends (Past 7 Days)
              </h4>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
                {dailyTrends.map((day) => {
                  const heightPct = Math.max(15, day.adherenceRate);
                  const isHealthy = day.adherenceRate >= 85;
                  const isModerate = day.adherenceRate >= 70 && day.adherenceRate < 85;

                  return (
                    <div key={day.date} className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-600 mb-1">{day.adherenceRate}%</span>
                      
                      {/* Bar Container */}
                      <div className="w-full bg-slate-100 h-24 rounded-xl p-1 flex flex-col justify-end">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-lg transition-all duration-500 ${
                            isHealthy
                              ? 'bg-emerald-500'
                              : isModerate
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          title={`${day.dayName}: ${day.given}/${day.scheduled} doses given`}
                        />
                      </div>

                      <span className="text-xs font-bold text-slate-700 mt-2">{day.dayName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{day.displayDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Skipped Doses Feed */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Skipped Doses Feed & Caregiver Observations
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
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
                          <span className="font-bold text-slate-800 text-sm">
                            {item.medicineName} ({item.strength})
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
                      <div>Logged by <strong className="text-slate-700">{item.caregiver}</strong></div>
                      <div>{new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">Prescribed Medicines</h3>
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
                    isLow ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{med.name}</h4>
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
                        <span key={t} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-mono font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Stock: <strong className="text-slate-800 font-bold">{med.currentStock} units</strong>
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
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
    </div>
  );
}
