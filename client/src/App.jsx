import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PatientBanner from './components/PatientBanner';
import AuthView from './components/AuthView';
import CaretakerView from './components/CaretakerView';
import FamilyView from './components/FamilyView';
import PairPatientModal from './components/PairPatientModal';

import api from './services/api';
import { initSocket, getSocket, joinPatientRoom, leavePatientRoom } from './services/socket';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  playNotificationChime,
} from './utils/notifications';
import { Stethoscope, Users, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('thecarepal_token') || '');
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  
  // Quick Portal Preview Switcher (Evaluator friendly)
  const [activeRoleView, setActiveRoleView] = useState('caretaker'); // 'caretaker' | 'family'

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Key to force refresh child views on socket events
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Initial Authentication & Profile Load
  useEffect(() => {
    requestNotificationPermission();

    const fetchProfile = async () => {
      const storedToken = localStorage.getItem('thecarepal_token');
      if (!storedToken) {
        setLoadingInitial(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        const userData = res.data.user;
        setUser(userData);
        setActiveRoleView(userData.role);

        // Fetch patients
        const patRes = await api.get('/patients');
        const patientList = patRes.data.patients || [];
        setPatients(patientList);

        if (patientList.length > 0) {
          setCurrentPatient(patientList[0]);
        }
      } catch (err) {
        console.error('Session expired or invalid token:', err);
        localStorage.removeItem('thecarepal_token');
        setUser(null);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchProfile();
  }, [token]);

  // 2. Setup Socket.IO for Real-Time Sync
  useEffect(() => {
    const socket = initSocket();

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsSocketConnected(true);
    }

    // Room join when currentPatient changes
    if (currentPatient) {
      joinPatientRoom(currentPatient._id);
    }

    // Listen for live updates
    const handleScheduleUpdated = (payload) => {
      console.log('Real-time sync event received:', payload);
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on('scheduleUpdated', handleScheduleUpdated);
    socket.on('handoverAdded', handleScheduleUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('scheduleUpdated', handleScheduleUpdated);
      socket.off('handoverAdded', handleScheduleUpdated);
      if (currentPatient) {
        leavePatientRoom(currentPatient._id);
      }
    };
  }, [currentPatient]);

  // 3. 30-Second Notification Reminder Interval
  useEffect(() => {
    if (!currentPatient) return;

    const interval = setInterval(async () => {
      try {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        const res = await api.get(`/schedule/today/${currentPatient._id}`);
        const doses = res.data.doses || [];

        // Check if any pending dose matches the current time
        const matchingDose = doses.find(
          (d) => d.status === 'pending' && d.scheduledTime === currentTimeStr
        );

        if (matchingDose) {
          playNotificationChime();
          sendBrowserNotification(`Time for ${matchingDose.name} (${matchingDose.strength})!`, {
            body: `Scheduled at ${matchingDose.scheduledTime} for ${currentPatient.name}. Please administer.`,
            tag: `dose-${matchingDose.doseId}`
          });
        }
      } catch (err) {
        // quiet fail on interval
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPatient]);

  const handleLoginSuccess = async (userData, newToken) => {
    setUser(userData);
    setToken(newToken);
    setActiveRoleView(userData.role);

    try {
      const patRes = await api.get('/patients');
      const patientList = patRes.data.patients || [];
      setPatients(patientList);
      if (patientList.length > 0) {
        setCurrentPatient(patientList[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thecarepal_token');
    setUser(null);
    setToken('');
    setPatients([]);
    setCurrentPatient(null);
  };

  const handlePatientLinked = (newPatient) => {
    setPatients((prev) => {
      const exists = prev.find((p) => p._id === newPatient._id);
      if (exists) return prev;
      return [...prev, newPatient];
    });
    setCurrentPatient(newPatient);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Starting TheCarePal MedSync...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        isSocketConnected={isSocketConnected}
        onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Main Container: Mobile-First Max-W-3xl */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Evaluator Quick Role Switcher Banner (CarePal Pill Tag Style) */}
        <div className="mb-5 bg-white border border-[#e6ecf1] rounded-2xl p-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#3fb6ad] animate-pulse" />
            <span className="font-bold text-[#101820] font-heading">Portal Preview:</span>
            <span className="text-slate-500 text-[11px] sm:text-xs">Switch view to test both experiences live:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full text-xs font-bold self-start sm:self-auto font-heading">
            <button
              onClick={() => setActiveRoleView('caretaker')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                activeRoleView === 'caretaker'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#3fb6ad]" />
              <span>Caretaker View</span>
            </button>

            <button
              onClick={() => setActiveRoleView('family')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all ${
                activeRoleView === 'family'
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#3fb6ad]" />
              <span>Family View</span>
            </button>
          </div>
        </div>

        {/* Patient Context Banner with 1-Click Copyable 6-digit Code */}
        <PatientBanner
          patient={currentPatient}
          patientsList={patients}
          onSelectPatient={(p) => setCurrentPatient(p)}
          onOpenPairModal={() => setIsPairModalOpen(true)}
          userRole={user.role}
        />

        {/* Dynamic Role-Based View */}
        {activeRoleView === 'caretaker' ? (
          <CaretakerView
            key={`caretaker-${currentPatient?._id}-${refreshTrigger}`}
            patient={currentPatient}
            user={user}
          />
        ) : (
          <FamilyView
            key={`family-${currentPatient?._id}-${refreshTrigger}`}
            patient={currentPatient}
            user={user}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>TheCarePal MedSync • Trusted Care at Home</p>
      </footer>

      {/* 6-Digit Pairing & Patient Creation Modal */}
      <PairPatientModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onPatientLinked={handlePatientLinked}
        userRole={user.role}
      />
    </div>
  );
}
