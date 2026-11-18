import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PatientBanner from './components/PatientBanner';
import AuthView from './components/AuthView';
import CaretakerView from './components/CaretakerView';
import FamilyView from './components/FamilyView';
import PairPatientModal from './components/PairPatientModal';

import api from './services/api';
import { initSocket, joinPatientRoom, leavePatientRoom } from './services/socket';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  playNotificationChime,
} from './utils/notifications';
import { HeartHandshake, PlusCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem('thecarepal_token') || localStorage.getItem('carepal_token') || ''
  );
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [liveAlert, setLiveAlert] = useState(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Key to force refresh child views on socket events
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Initial Authentication & Profile Load
  useEffect(() => {
    requestNotificationPermission();

    const fetchProfile = async () => {
      const storedToken =
        localStorage.getItem('thecarepal_token') || localStorage.getItem('carepal_token');
      if (!storedToken) {
        setLoadingInitial(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        const userData = res.data.user;
        setUser(userData);

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
        localStorage.removeItem('carepal_token');
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

    const handleCaregiverJoined = (data) => {
      if (user?.role === 'family' && data?.user && String(data.user._id) !== String(user._id)) {
        setLiveAlert({
          type: 'join',
          message: `${data.user.name} (${data.user.role || 'caregiver'}) joined ${data.patientName || 'the'}'s care team.`
        });
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    const handleAccessRevoked = (data) => {
      if (String(data.revokedUserId) === String(user?._id)) {
        setLiveAlert({
          type: 'revoked',
          message: 'Your access to this patient was revoked by the family.'
        });
        setPatients((prev) => {
          const remaining = prev.filter((p) => String(p._id) !== String(data.patientId));
          setCurrentPatient(remaining.length > 0 ? remaining[0] : null);
          return remaining;
        });
      } else {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    const handlePatientUpdated = (updatedPatient) => {
      if (!updatedPatient) return;
      setPatients((prev) =>
        prev.map((p) => (String(p._id) === String(updatedPatient._id) ? updatedPatient : p))
      );
      setCurrentPatient((curr) =>
        curr && String(curr._id) === String(updatedPatient._id) ? updatedPatient : curr
      );
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on('scheduleUpdated', handleScheduleUpdated);
    socket.on('handoverAdded', handleScheduleUpdated);
    socket.on('caregiverJoined', handleCaregiverJoined);
    socket.on('accessRevoked', handleAccessRevoked);
    socket.on('patientUpdated', handlePatientUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('scheduleUpdated', handleScheduleUpdated);
      socket.off('handoverAdded', handleScheduleUpdated);
      socket.off('caregiverJoined', handleCaregiverJoined);
      socket.off('accessRevoked', handleAccessRevoked);
      socket.off('patientUpdated', handlePatientUpdated);
      if (currentPatient) {
        leavePatientRoom(currentPatient._id);
      }
    };
  }, [currentPatient, user]);

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
    localStorage.removeItem('carepal_token');
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
        <div className="w-10 h-10 border-4 border-[#3fb6ad] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-[#101820] font-heading">Starting TheCarePal MedSync...</p>
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
        {/* Real-time Care Team & Access Alert Banner */}
        {liveAlert && (
          <div
            className={`mb-4 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in shadow-sm ${
              liveAlert.type === 'revoked'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-[#3fb6ad]/15 text-[#04302c] border border-[#3fb6ad]/30'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  liveAlert.type === 'revoked' ? 'bg-red-500' : 'bg-[#3fb6ad] animate-pulse'
                }`}
              />
              <span className="truncate">{liveAlert.message}</span>
            </div>
            <button
              onClick={() => setLiveAlert(null)}
              className="p-1 rounded-full hover:bg-black/5 text-slate-500 font-bold min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Onboarding State for Users Without Any Linked Patients */}
        {!currentPatient ? (
          <div className="bg-white border border-[#e6ecf1] rounded-3xl p-8 sm:p-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] my-6">
            <div className="w-16 h-16 rounded-full bg-[#3fb6ad]/15 text-[#04302c] mx-auto flex items-center justify-center mb-4 shadow-xs">
              <HeartHandshake className="w-8 h-8 text-[#3fb6ad]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#101820] font-heading mb-2">
              Welcome to TheCarePal, {user.name}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              {user.role === 'family'
                ? 'To begin tracking and managing medication schedules, create a patient profile for your loved one. A unique 6-digit Care Code will be generated for your caregivers.'
                : 'To begin administering and logging medications, link with your patient using the 6-digit Care Code provided by their family.'}
            </p>
            <button
              onClick={() => setIsPairModalOpen(true)}
              className="inline-flex items-center gap-2 py-3 px-6 rounded-full font-bold text-xs sm:text-sm bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{user.role === 'family' ? 'Create Patient Profile' : 'Enter 6-Digit Care Code'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Patient Context Banner with 1-Click Copyable 6-digit Code */}
            <PatientBanner
              patient={currentPatient}
              patientsList={patients}
              onSelectPatient={(p) => setCurrentPatient(p)}
              onOpenPairModal={() => setIsPairModalOpen(true)}
              userRole={user.role}
              onPatientUpdated={(updated) => {
                setPatients((prev) =>
                  prev.map((p) => (String(p._id) === String(updated._id) ? updated : p))
                );
                setCurrentPatient(updated);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />

            {/* Dynamic View: Caretaker Checklist vs Family Overview based on genuine user.role */}
            {user.role === 'caretaker' ? (
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
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#e6ecf1] bg-white text-center text-xs text-slate-500 font-medium">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-heading text-slate-700">TheCarePal MedSync • Trusted Care at Home</p>
          <p className="text-[11px] text-slate-400">Secure Live Synchronization via WebSocket</p>
        </div>
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