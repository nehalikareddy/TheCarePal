import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Camera,
  Trash2,
  Loader2,
  Phone,
  AlertTriangle,
  MapPin,
  Users,
  User,
  Heart,
  Check,
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

export default function PairPatientModal({ isOpen, onClose, onPatientLinked, userRole, user }) {
  // STRICT RULE OF HOOKS: All hooks must be defined at the very top before any conditional return
  const [activeTab, setActiveTab] = useState(userRole === 'caretaker' ? 'join' : 'create');

  // Join form state
  const [careCode, setCareCode] = useState('');

  // 2-Step Create form state
  const [createStep, setCreateStep] = useState(1); // 1 = Who is setting this up?, 2 = Patient Details
  const [accountType, setAccountType] = useState('family'); // 'family' | 'self'
  const [familyMemberName, setFamilyMemberName] = useState(user?.name || '');
  const [relation, setRelation] = useState(user?.relation || '');

  // Patient profile details (Step 2)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [condition, setCondition] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [allergies, setAllergies] = useState('');
  const [address, setAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync state whenever modal opens or user/userRole changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(userRole === 'caretaker' ? 'join' : 'create');
      setCreateStep(1);
      const userAccType = user?.accountType === 'self' ? 'self' : 'family';
      setAccountType(userAccType);
      setFamilyMemberName(user?.name || '');
      setRelation(user?.relation || '');
      setError('');
      setCareCode('');
      setPatientName('');
      setPatientAge('');
      setCondition('');
      setEmergencyContact('');
      setAllergies('');
      setAddress(user?.address || '');
      setProfilePicture('');
      setUploadingPhoto(false);
    }
  }, [isOpen, userRole, user]);

  if (!isOpen) return null;

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
          message: 'Request sent to family! You will get access as soon as they approve.',
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

  const handleStep1Proceed = (e) => {
    e.preventDefault();
    setError('');

    if (accountType === 'family') {
      if (!familyMemberName.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!relation.trim()) {
        setError('Please enter or select your relation to the patient (e.g. Son, Daughter, Spouse)');
        return;
      }
    } else {
      // Patient (Self): pre-fill patient name if not yet filled
      if (!patientName.trim()) {
        setPatientName(familyMemberName.trim() || user?.name || '');
      }
    }

    setCreateStep(2);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setError('');

    if (!patientName.trim()) {
      setError('Patient Full Name is required');
      return;
    }

    if (!patientAge || isNaN(Number(patientAge)) || Number(patientAge) <= 0) {
      setError('Valid patient age is required');
      return;
    }

    setLoading(true);

    try {
      // 1. If family account, update user account details (non-blocking sync)
      if (userRole === 'family') {
        try {
          await api.put('/auth/profile', {
            name: accountType === 'self' ? (patientName.trim() || user?.name) : familyMemberName.trim(),
            accountType,
            relation: accountType === 'family' ? relation.trim() : '',
            address: address.trim(),
          });
        } catch (profileErr) {
          console.warn('Profile sync non-blocking warning:', profileErr);
        }
      }

      // 2. Create the patient profile
      const res = await api.post('/patients', {
        name: patientName.trim(),
        age: Number(patientAge),
        condition: condition.trim() || 'Home Care',
        emergencyContact: emergencyContact.trim(),
        allergies: allergies.trim(),
        address: address.trim(),
        profilePicture: profilePicture || '',
        accountType,
        createdByRelation: accountType === 'family' ? relation.trim() : '',
      });

      onPatientLinked(res.data.patient);
      onClose();
    } catch (err) {
      console.error('Create patient error:', err);
      setError(err.response?.data?.message || 'Failed to create patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const quickRelations = ['Daughter', 'Son', 'Spouse', 'Parent', 'Sibling', 'Guardian'];

  return (
    <div className="fixed inset-0 z-50 bg-[#101820]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#e6ecf1] max-h-[92vh] overflow-y-auto p-4 sm:p-6 mx-3 sm:mx-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="pb-4 border-b border-[#e6ecf1] flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#3fb6ad]/15 text-[#04302c] flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#3fb6ad]" />
            </div>
            <h3 className="text-base font-bold text-[#101820] font-heading">
              {userRole === 'caretaker' ? 'Pair with Patient' : 'Add or Link Patient'}
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
              onClick={() => {
                setActiveTab('create');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-full transition-all font-heading ${
                activeTab === 'create'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Create New Patient
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-full transition-all font-heading ${
                activeTab === 'join'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Enter 6-Digit Code
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
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
                  Ask the family administrator for the patient's 6-digit Care Code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || careCode.length !== 6}
                className="w-full py-3 px-4 rounded-full text-xs sm:text-sm font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
              >
                <span>{loading ? 'Verifying...' : 'Link Patient via Care Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div>
              {/* ======================================================== */}
              {/* STEP 1: WHO IS SETTING THIS UP?                          */}
              {/* ======================================================== */}
              {createStep === 1 && (
                <form onSubmit={handleStep1Proceed} className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2 py-0.5 rounded-full font-heading">
                      Step 1 of 2: Setup Role
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Account Type
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 font-heading mb-2">
                      Who is setting up this account?
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountType('family');
                          setError('');
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          accountType === 'family'
                            ? 'bg-[#3fb6ad]/15 border-[#3fb6ad] ring-2 ring-[#3fb6ad]/40 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <Users
                            className={`w-5 h-5 ${
                              accountType === 'family' ? 'text-[#04302c]' : 'text-slate-500'
                            }`}
                          />
                          {accountType === 'family' && (
                            <span className="w-4 h-4 rounded-full bg-[#3fb6ad] text-[#04302c] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          Family Member
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Managing care for a relative
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountType('self');
                          setError('');
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          accountType === 'self'
                            ? 'bg-[#3fb6ad]/15 border-[#3fb6ad] ring-2 ring-[#3fb6ad]/40 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <User
                            className={`w-5 h-5 ${
                              accountType === 'self' ? 'text-[#04302c]' : 'text-slate-500'
                            }`}
                          />
                          {accountType === 'self' && (
                            <span className="w-4 h-4 rounded-full bg-[#3fb6ad] text-[#04302c] flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          Patient (Self)
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Managing my own schedule
                        </span>
                      </button>
                    </div>
                  </div>

                  {accountType === 'family' ? (
                    <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3.5 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 font-heading mb-1">
                          Your Name (Family Administrator) *
                        </label>
                        <input
                          type="text"
                          required
                          value={familyMemberName}
                          onChange={(e) => setFamilyMemberName(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 font-heading mb-1">
                          Relation to Patient *
                        </label>
                        <input
                          type="text"
                          required
                          value={relation}
                          onChange={(e) => setRelation(e.target.value)}
                          placeholder="e.g. Daughter, Son, Spouse, Guardian"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] text-sm"
                        />

                        {/* Quick Selection Pills */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {quickRelations.map((rel) => (
                            <button
                              key={rel}
                              type="button"
                              onClick={() => setRelation(rel)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-heading transition ${
                                relation === rel
                                  ? 'bg-[#3fb6ad] text-[#04302c] border-[#3fb6ad] font-bold shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {rel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 animate-in fade-in duration-150">
                      <p className="font-bold text-slate-900 font-heading">
                        Setting Up Self-Managed Care
                      </p>
                      <p className="leading-relaxed text-slate-500">
                        You will be registered as the patient. You can generate a 6-digit Care Code to invite family members or nurses whenever you need support.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-full text-xs sm:text-sm font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>
                      {accountType === 'family'
                        ? 'Proceed to Patient Details'
                        : 'Proceed to Fill Details'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* ======================================================== */}
              {/* STEP 2: PATIENT DETAILS                                  */}
              {/* ======================================================== */}
              {createStep === 2 && (
                <form onSubmit={handleCreatePatient} className="space-y-3.5">
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 font-heading transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Setup Mode</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#04302c] bg-[#3fb6ad]/20 px-2 py-0.5 rounded-full font-heading">
                      Step 2 of 2: Patient Info
                    </span>
                  </div>

                  {/* Summary context badge */}
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      Setup Mode: <strong className="text-slate-900">{accountType === 'family' ? `Family (${relation})` : 'Patient (Self)'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="text-[11px] font-bold text-[#04302c] hover:underline font-heading"
                    >
                      Change
                    </button>
                  </div>

                  {/* Optional Patient Profile Photo */}
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="relative shrink-0">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Patient"
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#3fb6ad]/15 text-[#04302c] font-bold text-lg flex items-center justify-center font-heading border border-[#3fb6ad]/30">
                          {getInitials(patientName || 'Patient')}
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 font-heading">
                        {profilePicture ? 'Photo Attached' : 'Patient Photo (Optional)'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Max 5 MB (JPG or PNG)
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#38a39b] cursor-pointer transition font-heading">
                          <Camera className="w-3 h-3" />
                          <span>{uploadingPhoto ? 'Uploading...' : 'Upload'}</span>
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
                      <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">
                        Patient Full Name *
                      </label>
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
                      <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">
                        Age *
                      </label>
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
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-bold text-[#101820] mb-1 font-heading">
                      Medical Condition / Note
                    </label>
                    <input
                      type="text"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="e.g. Post-Stroke Care & Hypertension"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label className="block text-xs font-bold text-[#101820] mb-1 font-heading flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Emergency Contact Numbers</span>
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. +91 98765 43210, Dr. Rao +91 91234 56789"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                    />
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-bold text-[#101820] mb-1 font-heading flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Allergies & Contraindications</span>
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Peanuts, Sulfa drugs, or 'None'"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-[#101820] mb-1 font-heading flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Home Address / Location</span>
                    </label>
                    <textarea
                      rows="2"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Sector 14, Gurgaon, Haryana"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    A unique 6-digit Care Code will be automatically generated upon creation.
                  </p>

                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="w-1/3 py-3 px-3 rounded-full text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 font-heading transition"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploadingPhoto}
                      className="w-2/3 py-3 px-4 rounded-full text-xs sm:text-sm font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create & Generate Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
