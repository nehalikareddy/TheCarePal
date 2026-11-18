import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Trash2,
  Loader2,
  Heart,
  Phone,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import api from '../services/api';

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P'
  );
}

export default function EditPatientModal({ isOpen, onClose, patient, onPatientUpdated }) {
  // STRICT RULE OF HOOKS: All hooks must be defined at the very top before any conditional return
  const [name, setName] = useState(patient?.name || '');
  const [age, setAge] = useState(patient?.age ?? '');
  const [condition, setCondition] = useState(patient?.condition || 'Home Care');
  const [profilePicture, setProfilePicture] = useState(patient?.profilePicture || '');
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergencyContact || '');
  const [allergies, setAllergies] = useState(patient?.allergies || '');
  const [address, setAddress] = useState(patient?.address || '');
  const [relation, setRelation] = useState(patient?.createdByRelation || '');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync form fields whenever modal opens or patient changes
  useEffect(() => {
    if (isOpen && patient) {
      setName(patient.name || '');
      setAge(patient.age !== undefined && patient.age !== null ? String(patient.age) : '');
      setCondition(patient.condition || 'Home Care');
      setProfilePicture(patient.profilePicture || '');
      setEmergencyContact(patient.emergencyContact || '');
      setAllergies(patient.allergies || '');
      setAddress(patient.address || '');
      setRelation(patient.createdByRelation || '');
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'carepal_prescriptions';

    if (!cloudName) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setProfilePicture(data.secure_url);
      } else {
        throw new Error(data.error?.message || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setError('Patient full name is required');
      return;
    }

    if (!age || isNaN(Number(age)) || Number(age) <= 0) {
      setError('Valid patient age is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        age: Number(age),
        condition: condition.trim() || 'Home Care',
        profilePicture: profilePicture || '',
        emergencyContact: emergencyContact.trim(),
        allergies: allergies.trim(),
        address: address.trim(),
        createdByRelation: relation.trim(),
      };

      const res = await api.put(`/patients/${patient._id}`, payload);
      const updatedPatient = res.data.patient;

      if (onPatientUpdated) {
        onPatientUpdated(updatedPatient);
      }

      setSuccessMessage('Patient details updated successfully!');
      setTimeout(() => {
        onClose();
      }, 750);
    } catch (err) {
      console.error('Update patient error:', err);
      setError(err.response?.data?.message || 'Failed to update patient profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 p-5 sm:p-7 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2.5 py-0.5 rounded-full font-heading">
                Edit Patient Profile
              </span>
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                Code: {patient.careCode}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-heading mt-1">
              Edit {patient.name}'s Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Patient Photo Section */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="relative shrink-0">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={name || 'Patient'}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#3fb6ad]/15 text-[#04302c] font-bold text-xl flex items-center justify-center font-heading border border-[#3fb6ad]/30">
                  {getInitials(name || patient.name)}
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 font-heading">
                {profilePicture ? 'Patient Photo Attached' : 'Patient Photo (Optional)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Helps caretakers identify the patient (max 5 MB).
              </p>
              <div className="flex items-center gap-2 mt-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#38a39b] cursor-pointer transition font-heading shadow-xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={() => setProfilePicture('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Verma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                Age *
              </label>
              <input
                type="number"
                required
                min="1"
                max="125"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 74"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
              />
            </div>
          </div>

          {/* Condition & Relation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                Care / Medical Condition
              </label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. Post-Stroke Care, Hypertension"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                Relation (e.g. Daughter, Son)
              </label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Daughter, Son, Spouse"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Emergency Contact Numbers</span>
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. +91 98765 43210, Dr. Rao +91 91234 56789"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
            />
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Allergies & Contraindications</span>
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Sulfa drugs, or 'None'"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Home Address / Location</span>
            </label>
            <textarea
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House 42, Sector 14, Gurgaon, Haryana"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition font-heading"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="px-5 py-2.5 rounded-xl bg-[#3fb6ad] hover:bg-[#38a39b] text-[#04302c] text-xs sm:text-sm font-bold transition font-heading shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
