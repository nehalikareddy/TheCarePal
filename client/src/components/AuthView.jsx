import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { Users, Stethoscope, ArrowRight, ShieldCheck, HeartHandshake, Lock, Mail, User } from 'lucide-react';
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
        ? { email, password }
        : { name, email, password, role };

      const res = await api.post(endpoint, payload);
      localStorage.setItem('thecarepal_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Login Handler for Rohan Verma (Family)
  const handleDemoFamily = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: 'rohan.family@demo.com',
        password: 'Demo@123',
      });
      localStorage.setItem('thecarepal_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError('Demo login failed. Make sure database seed script has run.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Login Handler for Nurse Kavita (Caretaker)
  const handleDemoCaretaker = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: 'kavita.nurse@demo.com',
        password: 'Demo@123',
      });
      localStorage.setItem('thecarepal_token', res.data.token);
      onLoginSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError('Demo login failed. Make sure database seed script has run.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="large" showSubtitle={false} />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
          MedSync Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
          Shared Medication Schedule, Real-Time Adherence & Reminders
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-sm rounded-3xl border border-slate-200">
          
          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('family')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                role === 'family'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Family Member</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('caretaker')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                role === 'caretaker'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Nurse / Caretaker</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-800">
              {isLoginMode
                ? `Sign In as ${role === 'family' ? 'Family Member' : 'Nurse / Caretaker'}`
                : `Create ${role === 'family' ? 'Family' : 'Caretaker'} Account`}
            </h3>
            <p className="text-xs text-slate-500">
              {isLoginMode
                ? 'Enter your credentials to access the shared care dashboard.'
                : 'Sign up to coordinate medications with patient caregivers.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'family' ? 'e.g. Rohan Verma' : 'e.g. Nurse Kavita R.'}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-slate-50/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
            >
              {isLoginMode
                ? "Don't have an account? Sign up here"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Evaluator 1-Click Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#E07A5F]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                1-Click Evaluator Demo Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Demo Family Button */}
              <button
                type="button"
                onClick={handleDemoFamily}
                disabled={loading}
                className="flex items-center gap-2.5 p-3 rounded-2xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 hover:border-teal-300 transition-all text-left group active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900 truncate">
                    Demo: Family
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Rohan Verma
                  </div>
                </div>
              </button>

              {/* Demo Caretaker Button */}
              <button
                type="button"
                onClick={handleDemoCaretaker}
                disabled={loading}
                className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 hover:border-amber-300 transition-all text-left group active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-[#E07A5F] text-white flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-amber-900 truncate">
                    Demo: Caretaker
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Nurse Kavita
                  </div>
                </div>
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
              Pre-linked to Patient Ramesh Verma (Care Code: 482910)
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
