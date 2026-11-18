import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Camera,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  User,
  Users,
  AlertTriangle,
  Phone,
  MapPin,
  Stethoscope,
} from 'lucide-react';

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  isFirstTimePrompt = false,
  patients = [],
  activePatient = null,
  onPatientSaved,
}) {
  // STRICT RULE OF HOOKS: All hooks must be defined at the very top, before any return statement.
  const [userName, setUserName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [age, setAge] = useState(user?.age ?? '');
  const [sex, setSex] = useState(user?.sex || '');
  const [qualification, setQualification] = useState(user?.qualification || '');
  const [accountType, setAccountType] = useState(user?.accountType || 'family'); // 'family' | 'self'
  const [relation, setRelation] = useState(user?.relation || '');
  const [address, setAddress] = useState(user?.address || '');

  // Patient profile states for family onboarding / editing
  const [patientPhoto, setPatientPhoto] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientCondition, setPatientCondition] = useState('Home Care');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [allergies, setAllergies] = useState('');
  const [patientAddress, setPatientAddress] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync form fields whenever modal opens or user/patients change
  useEffect(() => {
    if (isOpen && user) {
      setUserName(user.name || '');
      setProfilePicture(user.profilePicture || '');
      setAge(user.age ?? '');
      setSex(user.sex || '');
      setQualification(user.qualification || '');
      const currentAccType = user.accountType || 'family';
      setAccountType(currentAccType);
      setRelation(user.relation || '');
      setAddress(user.address || '');

      const targetPat = activePatient || (patients && patients.length > 0 ? patients[0] : null);
      if (targetPat) {
        setPatientPhoto(targetPat.profilePicture || '');
        setPatientName(targetPat.name || '');
        setPatientAge(targetPat.age !== undefined && targetPat.age !== null ? String(targetPat.age) : '');
        setPatientCondition(targetPat.condition || 'Home Care');
        setEmergencyContact(targetPat.emergencyContact || '');
        setAllergies(targetPat.allergies || '');
        setPatientAddress(targetPat.address || user.address || '');
      } else {
        if (currentAccType === 'self') {
          setPatientName(user.name || '');
        } else {
          setPatientName('');
        }
        setPatientPhoto('');
        setPatientAge('');
        setPatientCondition('Home Care');
        setEmergencyContact('');
        setAllergies('');
        setPatientAddress(user.address || '');
      }

      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, user, activePatient, patients]);

  if (!isOpen || !user) return null;

  const handlePhotoUpload = async (e, type = 'patient') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'carepal_prescriptions';

    if (!cloudName) {
      // Local fallback: read as data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'patient') {
          setPatientPhoto(reader.result);
        } else {
          setProfilePicture(reader.result);
        }
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
        if (type === 'patient') {
          setPatientPhoto(data.secure_url);
        } else {
          setProfilePicture(data.secure_url);
        }
      } else {
        throw new Error(data.error?.message || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Photo upload failed: ' + (err.message || 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleAccountTypeChange = (type) => {
    setAccountType(type);
    if (type === 'self') {
      if (!patientName.trim()) {
        setPatientName(userName || user.name || '');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (user.role === 'caretaker') {
      if (!userName.trim()) {
        setError('Full Name is required');
        return;
      }

      setSaving(true);
      try {
        const payload = {
          name: userName.trim(),
          profilePicture: profilePicture || '',
          age: age ? Number(age) : null,
          sex,
          qualification: qualification.trim(),
          accountType: 'family',
          relation: '',
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
        }, 800);
      } catch (err) {
        console.error('Save caretaker profile error:', err);
        setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Role is 'family'
    const finalUserName =
      accountType === 'self'
        ? (patientName.trim() || userName.trim() || user.name)
        : userName.trim();

    if (accountType === 'family' && !finalUserName) {
      setError('Your Name is required');
      return;
    }

    const finalPatientName = accountType === 'self' ? finalUserName : patientName.trim();
    if (!finalPatientName) {
      setError('Patient Full Name is required');
      return;
    }

    if (!patientAge || isNaN(Number(patientAge)) || Number(patientAge) <= 0) {
      setError('Valid Patient Age is required');
      return;
    }

    setSaving(true);

    try {
      // 1. Update user account profile
      const userPayload = {
        name: finalUserName,
        profilePicture: accountType === 'self' ? (patientPhoto || profilePicture) : profilePicture,
        age: accountType === 'self' && patientAge ? Number(patientAge) : (age ? Number(age) : null),
        sex: accountType === 'self' ? sex : '',
        qualification: '',
        accountType,
        relation: accountType === 'family' ? relation.trim() : '',
        address: (patientAddress || address).trim(),
      };

      const userRes = await api.put('/auth/profile', userPayload);
      const updatedUser = userRes.data.user;

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      // 2. Create or update patient record
      const targetPat = activePatient || (patients && patients.length > 0 ? patients[0] : null);
      const patientPayload = {
        name: finalPatientName,
        age: Number(patientAge),
        condition: patientCondition.trim() || 'Home Care',
        profilePicture: patientPhoto || '',
        emergencyContact: emergencyContact.trim(),
        allergies: allergies.trim(),
        address: (patientAddress || address).trim(),
      };

      let savedPatient = null;
      if (targetPat && targetPat._id) {
        // Update existing patient
        const patRes = await api.put(`/patients/${targetPat._id}`, patientPayload);
        savedPatient = patRes.data.patient;
      } else {
        // Create new patient
        const patRes = await api.post('/patients', patientPayload);
        savedPatient = patRes.data.patient;
      }

      if (savedPatient && onPatientSaved) {
        onPatientSaved(savedPatient);
      }

      setSuccessMessage('Profile and Patient details saved successfully!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Save family & patient profile error:', err);
      setError(
        err.response?.data?.message || 'Failed to save profile details. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const isEditingExistingPatient = Boolean(
    activePatient || (patients && patients.length > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 p-5 sm:p-7 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2.5 py-0.5 rounded-full font-heading">
              {user.role === 'caretaker'
                ? 'Caretaker / Nurse Profile'
                : isEditingExistingPatient
                ? 'Patient & Family Profile'
                : 'Welcome • Account Setup'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-heading mt-1">
              {user.role === 'caretaker'
                ? isFirstTimePrompt
                  ? 'Complete Caregiver Profile'
                  : 'Edit Caregiver Profile'
                : isFirstTimePrompt
                ? 'Patient Profile Onboarding'
                : 'Edit Patient & Account Profile'}
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

        {/* Error / Success Notifications */}
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
          {/* ========================================================= */}
          {/* ROLE: CARETAKER FORM                                      */}
          {/* ========================================================= */}
          {user.role === 'caretaker' && (
            <>
              {/* Caretaker Photo */}
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
                      {getInitials(userName || user.name)}
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
                    Upload a professional photo (max 5 MB).
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#38a39b] cursor-pointer transition font-heading shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'user')}
                        disabled={uploading}
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

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-sm"
                />
              </div>

              {/* Age and Sex */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-sm bg-white"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown to patient families when you request access to their care team.
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1">
                  Address / Operational Area
                </label>
                <textarea
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sector 14, Gurgaon, Haryana"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-transparent text-sm"
                />
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* ROLE: FAMILY ACCOUNT (PATIENT-FIRST ONBOARDING & PROFILE) */}
          {/* ========================================================= */}
          {user.role === 'family' && (
            <>
              {/* Prominent Toggle: Who is setting up this account? */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 font-heading mb-2">
                  Who is setting up this account?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('family')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition ${
                      accountType === 'family'
                        ? 'bg-[#3fb6ad] text-[#04302c] border-[#3fb6ad] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Family Member</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('self')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition ${
                      accountType === 'self'
                        ? 'bg-[#3fb6ad] text-[#04302c] border-[#3fb6ad] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Patient (Self)</span>
                  </button>
                </div>
              </div>

              {/* Family Member Section (Shown if Family Member is selected) */}
              {accountType === 'family' && (
                <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/70 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 font-heading">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>Your Details (Family Administrator)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1">
                        Relation to Patient
                      </label>
                      <input
                        type="text"
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        placeholder="e.g. Daughter, Son, Spouse, Guardian"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Profile Details Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-heading">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>
                      {accountType === 'self' ? 'Your Patient Profile' : 'Patient Profile Details'}
                    </span>
                  </div>
                  {isEditingExistingPatient && (
                    <span className="text-[10px] font-medium text-slate-500">
                      Syncs to Care Code
                    </span>
                  )}
                </div>

                {/* Patient Profile Photo */}
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white border border-slate-200/80">
                  <div className="relative shrink-0">
                    {patientPhoto ? (
                      <img
                        src={patientPhoto}
                        alt="Patient"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-[#3fb6ad]/15 text-[#04302c] font-bold text-lg flex items-center justify-center font-heading border border-[#3fb6ad]/30">
                        {getInitials(patientName || 'Patient')}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 font-heading">
                      {patientPhoto ? 'Patient Photo Attached' : 'Optional Patient Photo'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Helps caretakers identify the patient quickly.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#38a39b] cursor-pointer transition font-heading">
                        <Camera className="w-3 h-3" />
                        <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'patient')}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      {patientPhoto && (
                        <button
                          type="button"
                          onClick={() => setPatientPhoto('')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient Name and Age */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        if (accountType === 'self') {
                          setUserName(e.target.value);
                        }
                      }}
                      placeholder="e.g. Ramesh Verma"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1">
                      Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="125"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 74"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                    />
                  </div>
                </div>

                {/* Care Type / Medical Condition */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1">
                    Care Type / Medical Condition
                  </label>
                  <input
                    type="text"
                    value={patientCondition}
                    onChange={(e) => setPatientCondition(e.target.value)}
                    placeholder="e.g. Post-Stroke Care, Hypertension, Elder Assistance"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                  />
                </div>

                {/* Emergency Contact Numbers */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>Emergency Contact Numbers</span>
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210, Dr. Rao +91 91234 56789"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Visible immediately to caretakers on duty for urgent reach.
                  </p>
                </div>

                {/* Allergies Alert */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span>Allergies & Contraindications</span>
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Peanuts, Sulfa drugs, or 'None'"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Prominently displayed on medicine check and patient header.
                  </p>
                </div>

                {/* Patient Address / Home Location */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-heading mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>Patient Home Address / Location</span>
                  </label>
                  <textarea
                    rows="2"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    placeholder="e.g. House 42, Sector 14, Gurgaon, Haryana"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
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
              className="px-5 py-2.5 rounded-xl bg-[#3fb6ad] hover:bg-[#38a39b] text-[#04302c] text-xs sm:text-sm font-bold transition font-heading shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
