import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { Users, Stethoscope, ArrowRight, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function AuthView({ onLoginSuccess }) {
  const [role, setRole] = useState('family'); // 'family' | 'caretaker'
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      const payload = isLoginMode
        ? { email: email.trim().toLowerCase(), password }
        : { name: name.trim(), email: email.trim().toLowerCase(), password, role };

      const res = await api.post(endpoint, payload);
      localStorage.setItem('carepal_token', res.data.token);
      localStorage.setItem('thecarepal_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="large" showSubtitle={false} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#101820] tracking-tight font-heading">
          MedSync Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
          Shared Medication Schedule, Real-Time Adherence & Reminders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 rounded-3xl border border-[#e6ecf1] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          {/* Role Selector Tabs (Pill style matching TheCarePal) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-full mb-6">
            <button
              type="button"
              onClick={() => setRole('family')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all font-heading ${
                role === 'family'
                  ? 'bg-white text-[#101820] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#3fb6ad]" />
              <span>Family Member</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('caretaker')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all font-heading ${
                role === 'caretaker'
                  ? 'bg-white text-[#101820] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#3fb6ad]" />
              <span>Nurse / Caretaker</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-5">
            <h3 className="text-base font-bold text-[#101820] font-heading">
              {isLoginMode
                ? `Sign In as ${role === 'family' ? 'Family Member' : 'Nurse / Caretaker'}`
                : `Create ${role === 'family' ? 'Family' : 'Caretaker'} Account`}
            </h3>
            <p className="text-xs text-slate-500">
              {isLoginMode
                ? 'Enter your credentials to access your shared patient care dashboard.'
                : 'Sign up to coordinate medications with patient caregivers.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'family' ? 'e.g. Rohan Verma' : 'e.g. Nurse Kavita R.'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] transition-all bg-slate-50/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] transition-all bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-heading">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Signature CarePal Teal CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-full text-sm font-bold text-[#04302c] bg-[#3fb6ad] hover:bg-[#37a79e] shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-heading active:scale-[0.98]"
            >
              <span>{loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
              }}
              className="text-xs font-bold text-[#0074ff] hover:text-[#005fd1] transition-colors font-heading"
            >
              {isLoginMode
                ? "Don't have an account? Sign up here"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Production Trust & Security Guarantee */}
          <div className="mt-6 pt-5 border-t border-[#e6ecf1] flex items-center justify-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#3fb6ad] shrink-0" />
            <p className="text-[11px] leading-relaxed text-center font-medium">
              HIPAA & NDHM Aligned • End-to-End Encrypted Care Coordination
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} The CarePal Healthcare Solutions Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
