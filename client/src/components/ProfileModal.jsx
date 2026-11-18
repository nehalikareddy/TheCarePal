import React, { useState } from 'react';
import api from '../services/api';
import { User, Camera, Upload, Trash2, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, isFirstTimePrompt = false }) {
  if (!isOpen || !user) return null;

  const [name, setName] = useState(user.name || '');
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || '');
  const [age, setAge] = useState(user.age || '');
  const [sex, setSex] = useState(user.sex || '');
  const [qualification, setQualification] = useState(user.qualification || '');
  const [accountType, setAccountType] = useState(user.accountType || 'family');
  const [relation, setRelation] = useState(user.relation || '');
  const [address, setAddress] = useState(user.address || '');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'carepal_prescriptions';

    if (!cloudName) {
      // Local fallback / data URL if Cloudinary is not configured in local environment
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
      return;
    }

    setUploading(true);
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
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Image upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setProfilePicture('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        name: name.trim(),
        profilePicture: profilePicture || '',
        age: age ? Number(age) : null,
        sex,
        qualification: user.role === 'caretaker' ? qualification.trim() : '',
        accountType: user.role === 'family' ? accountType : 'family',
        relation: user.role === 'family' && accountType === 'family' ? relation.trim() : '',
        address: address.trim(),
      };

      const res = await api.put('/auth/profile', payload);
      const updatedUser = res.data.user;

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
      setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 sm:p-7 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2 py-0.5 rounded-full font-heading">
              {user.role === 'caretaker' ? 'Caretaker / Nurse Profile' : 'Family Account Profile'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-heading mt-1">
              {isFirstTimePrompt ? 'Complete Your Profile' : 'Edit Profile'}
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

        {/* Form Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Profile Picture Section */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="relative shrink-0">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#3fb6ad]/20 text-[#04302c] font-bold text-xl flex items-center justify-center font-heading border border-[#3fb6ad]/40">
                  {getInitials(name || user.name)}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 font-heading">
                {profilePicture ? 'Custom Profile Photo' : 'No photo uploaded'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a clear photo (JPG or PNG, max 5 MB).
              </p>
              <div className="flex items-center gap-2 mt-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#38a39b] cursor-pointer transition font-heading shadow-xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm"
            />
          </div>

          {/* Role: Caretaker Inputs */}
          {user.role === 'caretaker' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Age */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 29"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm"
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm bg-white"
                  >
                    <option value="">Select Sex</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Nursing / Caretaker Qualification
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. B.Sc Nursing, GNM, Certified Elder Caregiver"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown to patient families when you request to join their care team.
                </p>
              </div>
            </>
          )}

          {/* Role: Family Inputs */}
          {user.role === 'family' && (
            <>
              {/* Profile Type: Patient (Self) vs Family Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Profile Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('family')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading transition ${
                      accountType === 'family'
                        ? 'bg-[#3fb6ad]/20 border-[#3fb6ad] text-[#04302c]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Family Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('self')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading transition ${
                      accountType === 'self'
                        ? 'bg-[#3fb6ad]/20 border-[#3fb6ad] text-[#04302c]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Patient (Self)
                  </button>
                </div>
              </div>

              {/* Relation (Shown when Family Member is selected) */}
              {accountType === 'family' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                    Relation to Patient
                  </label>
                  <input
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    placeholder="e.g. Son, Daughter, Spouse, Guardian"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm"
                  />
                </div>
              )}
            </>
          )}

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
              Address / Location
            </label>
            <textarea
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Sector 14, Gurgaon, Haryana"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-base sm:text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition font-heading"
            >
              {isFirstTimePrompt ? 'Complete Later' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-[#3fb6ad] hover:bg-[#38a39b] text-[#04302c] text-xs sm:text-sm font-bold transition font-heading shadow-md active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
