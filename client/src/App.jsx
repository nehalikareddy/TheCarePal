import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PatientBanner from './components/PatientBanner';
import AuthView from './components/AuthView';
import CaretakerView from './components/CaretakerView';
import FamilyView from './components/FamilyView';
import PairPatientModal from './components/PairPatientModal';
import ProfileModal from './components/ProfileModal';
import EditPatientModal from './components/EditPatientModal';
import SelectProfileView from './components/SelectProfileView';

import api from './services/api';
import {
  initSocket,
  joinPatientRoom,
  leavePatientRoom,
  joinUserRoom,
  leaveUserRoom,
} from './services/socket';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  playNotificationChime,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from './utils/notifications';
import {
  initAudioOnUserInteraction,
  unlockAudio,
  playApprovalChime,
  playOverdueAlertChime,
} from './utils/notificationSound';
import {
  HeartHandshake,
  PlusCircle,
  UserCheck,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

const OVERDUE_GRACE_MINUTES = 15;

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem('thecarepal_token') || localStorage.getItem('carepal_token') || ''
  );
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFirstTimeProfile, setIsFirstTimeProfile] = useState(false);
  const [liveAlert, setLiveAlert] = useState(null);

  // Caregiver Access Approval Workflow States
  const [pendingRequests, setPendingRequests] = useState([]); // Family view: incoming caregiver requests
  const [pendingApprovals, setPendingApprovals] = useState([]); // Caretaker view: requested patients awaiting approval

  // Automatic Overdue Medication Watcher States
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const alertedOverdueRef = useRef(new Set());

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Key to force refresh child views on socket events
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Silent Audio Unlock on user's first pointerdown or keydown event
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // 1b. Automatically prompt profile completion once if not yet completed (caretakers only)
  useEffect(() => {
    if (user && user.role === 'caretaker' && !user.profileCompleted) {
      const promptKey = `carepal_profile_prompted_${user.id || user._id}`;
      if (!sessionStorage.getItem(promptKey)) {
        setIsProfileModalOpen(true);
        setIsFirstTimeProfile(true);
        sessionStorage.setItem(promptKey, 'true');
      }
    }
  }, [user]);

  // 1c. Register Web Push Subscription when user is logged in and notification permission is granted
  useEffect(() => {
    if (!user) return;

    const setupPush = async () => {
      try {
        const perm = await requestNotificationPermission();
        if (perm === 'granted' || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
          await subscribeToWebPush(api);
        }
      } catch (err) {
        console.warn('Web push setup error:', err);
      }
    };

    setupPush();
  }, [user]);

  // 2. Initial Authentication & Profile Load
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

        // Fetch user's approved patients
        const patRes = await api.get('/patients');
        const patientList = patRes.data.patients || [];
        setPatients(patientList);
        // Do not auto-set currentPatient so user lands on Select Profile screen

        // If caretaker, fetch any pending approval requests across page refreshes
        if (userData.role === 'caretaker') {
          try {
            const pendingRes = await api.get('/patients/my-pending');
            setPendingApprovals(pendingRes.data.pending || []);
          } catch (e) {
            console.error('Failed to load pending caretaker approvals:', e);
          }
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

  // 3. For Family: Fetch existing pending approval requests when currentPatient changes
  useEffect(() => {
    if (!currentPatient || user?.role !== 'family') {
      setPendingRequests([]);
      return;
    }

    api
      .get(`/patients/${currentPatient._id}/members`)
      .then((res) => {
        const list = res.data.pendingMembers || [];
        setPendingRequests(
          list.map((pm) => ({
            patientId: currentPatient._id,
            patientName: currentPatient.name,
            request: pm,
          }))
        );
      })
      .catch(() => {
        setPendingRequests([]);
      });
  }, [currentPatient, user]);

  // 4. Setup Socket.IO for Real-Time Sync & Direct User Alerts
  useEffect(() => {
    const socket = initSocket();
    const currentUserId = user?._id || user?.id;

    const onConnect = () => {
      setIsSocketConnected(true);
      if (currentUserId) {
        socket.emit('joinUserRoom', String(currentUserId));
      }
      if (currentPatient?._id) {
        joinPatientRoom(currentPatient._id);
      }
    };
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsSocketConnected(true);
    }

    // Join patient room
    if (currentPatient?._id) {
      joinPatientRoom(currentPatient._id);
    }

    // Join user's private notification room immediately when user is set
    if (currentUserId) {
      socket.emit('joinUserRoom', String(currentUserId));
    }

    // Listen for schedule & handover updates
    const handleScheduleUpdated = (payload) => {
      console.log('Real-time sync event received:', payload);
      setRefreshTrigger((prev) => prev + 1);

      // Automatically clear the banner if the dose is marked given or skipped via live Socket.IO updates
      if (payload && (payload.status === 'given' || payload.status === 'skipped')) {
        setOverdueAlerts((prev) =>
          prev.filter((alert) => {
            const isMatch =
              (payload.medicineId && String(alert.medicineId) === String(payload.medicineId) &&
               payload.scheduledTime && String(alert.scheduledTime) === String(payload.scheduledTime)) ||
              (alert.key === `${payload.medicineId}_${payload.scheduledTime}_${payload.scheduledDate}`);
            return !isMatch;
          })
        );
      }
    };

    // Family Approval Workflow: Caregiver requests access
    const handleAccessRequested = (data) => {
      if (user?.role === 'family') {
        playApprovalChime();
        setPendingRequests((prev) => {
          const exists = prev.some(
            (r) =>
              String(r.patientId) === String(data.patientId) &&
              String(r.request?.userId) === String(data.request?.userId)
          );
          if (exists) return prev;
          return [data, ...prev];
        });
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    // Caretaker View: Family approved caretaker access
    const handleAccessApproved = (data) => {
      const approvedPatient = data.patient || { _id: data.patientId, name: data.patientName };
      if (approvedPatient && approvedPatient._id) {
        setPatients((prev) => {
          const exists = prev.find((p) => String(p._id) === String(approvedPatient._id));
          return exists ? prev : [...prev, approvedPatient];
        });
        setCurrentPatient(approvedPatient);
      }
      setPendingApprovals((prev) =>
        prev.filter((p) => String(p._id) !== String(data.patientId || data.patient?._id))
      );
      setLiveAlert({
        type: 'success',
        message: `Access approved! You can now view ${data.patientName || data.patient?.name || 'the patient'}'s schedule.`,
      });
      setRefreshTrigger((prev) => prev + 1);
    };

    // Caretaker View: Family declined caretaker access
    const handleAccessRejected = (data) => {
      setPendingApprovals((prev) =>
        prev.filter((p) => String(p._id) !== String(data.patientId))
      );
      setLiveAlert({
        type: 'warning',
        message: `Your access request for ${data.patientName || 'the patient'} was declined by the family.`,
      });
    };

    // Access revoked by family
    const handleAccessRevoked = (data) => {
      if (String(data.revokedUserId) === String(currentUserId)) {
        setLiveAlert({
          type: 'revoked',
          message: 'Your access to this patient was revoked by the family.',
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

    // Patient profile updated (e.g. rotated Care Code)
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
    socket.on('careTeamUpdated', handleScheduleUpdated);
    socket.on('accessRequested', handleAccessRequested);
    socket.on('accessApproved', handleAccessApproved);
    socket.on('accessRejected', handleAccessRejected);
    socket.on('accessRevoked', handleAccessRevoked);
    socket.on('patientUpdated', handlePatientUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('scheduleUpdated', handleScheduleUpdated);
      socket.off('handoverAdded', handleScheduleUpdated);
      socket.off('careTeamUpdated', handleScheduleUpdated);
      socket.off('accessRequested', handleAccessRequested);
      socket.off('accessApproved', handleAccessApproved);
      socket.off('accessRejected', handleAccessRejected);
      socket.off('accessRevoked', handleAccessRevoked);
      socket.off('patientUpdated', handlePatientUpdated);
      if (currentPatient?._id) {
        leavePatientRoom(currentPatient._id);
      }
      if (currentUserId) {
        socket.emit('leaveUserRoom', String(currentUserId));
      }
    };
  }, [currentPatient, user]);

  // 5. Automatic Overdue Medication Watcher & On-Time Reminder (Runs every 30 seconds for activePatient)
  useEffect(() => {
    if (!currentPatient?._id) return;

    const checkOverdueSchedule = async () => {
      try {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMins = now.getMinutes();
        const currentTotalMinutes = currentHours * 60 + currentMins;
        const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;

        const res = await api.get(`/schedule/today/${currentPatient._id}`);
        const doses = res.data.doses || [];
        const todayDate = res.data.date || new Date().toISOString().split('T')[0];

        // 1. On-time notification reminder (matching exact current minute)
        const onTimeDose = doses.find(
          (d) => d.status === 'pending' && d.scheduledTime === currentTimeStr
        );
        if (onTimeDose) {
          playNotificationChime();
          sendBrowserNotification(`Time for ${onTimeDose.name} (${onTimeDose.strength || onTimeDose.dose})!`, {
            body: `Scheduled at ${onTimeDose.scheduledTime} for ${currentPatient.name}. Please administer.`,
            tag: `dose-${onTimeDose.doseId}`,
          });
        }

        // 2. Overdue dose check (Grace period >= OVERDUE_GRACE_MINUTES)
        const newOverdueAlerts = [];
        let hasNewOverdue = false;

        doses.forEach((dose) => {
          if (dose.status === 'pending' && dose.scheduledTime) {
            const [sh, sm] = dose.scheduledTime.split(':').map((v) => parseInt(v, 10) || 0);
            const scheduledTotalMinutes = sh * 60 + sm;
            const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

            if (diffMinutes >= OVERDUE_GRACE_MINUTES) {
              const doseDate = dose.scheduledDate || todayDate;
              const doseKey = `${dose.medicineId}_${dose.scheduledTime}_${doseDate}`;
              const doseAmount = dose.dose || dose.strength || '';

              const alertItem = {
                key: doseKey,
                medicineId: dose.medicineId,
                scheduledTime: dose.scheduledTime,
                scheduledDate: doseDate,
                medicineName: dose.name,
                dose: doseAmount,
                message: `Overdue Dose: ${dose.name} (${doseAmount}) was scheduled for ${dose.scheduledTime}.`,
              };

              newOverdueAlerts.push(alertItem);

              if (!alertedOverdueRef.current.has(doseKey)) {
                alertedOverdueRef.current.add(doseKey);
                hasNewOverdue = true;
              }
            }
          }
        });

        if (hasNewOverdue) {
          playOverdueAlertChime();
        }

        // Automatically sync overdueAlerts with current schedule, removing any that were logged
        setOverdueAlerts((prev) => {
          if (newOverdueAlerts.length === 0) return [];
          const merged = [...prev];
          newOverdueAlerts.forEach((item) => {
            if (!merged.some((m) => m.key === item.key)) {
              merged.push(item);
            }
          });
          return merged.filter((item) => newOverdueAlerts.some((na) => na.key === item.key));
        });
      } catch (err) {
        // Quiet fail on periodic background poll
      }
    };

    checkOverdueSchedule();
    const interval = setInterval(checkOverdueSchedule, 30000);

    return () => clearInterval(interval);
  }, [currentPatient]);

  // 6. 5-Second Auto-Sync While Pending for Caretakers
  useEffect(() => {
    if (user?.role !== 'caretaker' || !pendingApprovals || pendingApprovals.length === 0) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const [patRes, pendingRes] = await Promise.all([
          api.get('/patients'),
          api.get('/patients/my-pending'),
        ]);

        const updatedPatients = patRes.data?.patients || [];
        const updatedPending = pendingRes.data?.pending || [];

        // Check if a previously pending patient now appears in /api/patients
        const newlyApprovedPatient = updatedPatients.find((p) =>
          pendingApprovals.some((pending) => String(pending._id) === String(p._id))
        );

        if (newlyApprovedPatient) {
          setPatients(updatedPatients);
          setCurrentPatient(newlyApprovedPatient);
          setPendingApprovals((prev) =>
            prev.filter((pending) => String(pending._id) !== String(newlyApprovedPatient._id))
          );
          setLiveAlert({
            type: 'success',
            message: `Access approved! You can now view ${newlyApprovedPatient.name}'s schedule.`,
          });
          setRefreshTrigger((prev) => prev + 1);
        } else {
          // If a pending request was declined or removed by family
          const rejectedPatients = pendingApprovals.filter(
            (prevP) =>
              !updatedPending.some((p) => String(p._id) === String(prevP._id)) &&
              !updatedPatients.some((p) => String(p._id) === String(prevP._id))
          );
          if (rejectedPatients.length > 0) {
            setLiveAlert({
              type: 'warning',
              message: `Your access request for ${rejectedPatients[0].name || 'the patient'} was declined by the family.`,
            });
          }
          setPendingApprovals(updatedPending);
        }
      } catch (err) {
        // Quiet fail on background sync interval
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user?.role, pendingApprovals]);

  const handleLoginSuccess = async (userData, newToken) => {
    setUser(userData);
    setToken(newToken);

    try {
      const patRes = await api.get('/patients');
      const patientList = patRes.data.patients || [];
      setPatients(patientList);
      // Do not auto-set currentPatient so user lands on Select Profile screen

      if (userData.role === 'caretaker') {
        const pendingRes = await api.get('/patients/my-pending');
        setPendingApprovals(pendingRes.data.pending || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await unsubscribeFromWebPush(api);
    } catch (e) {
      console.warn('Push unsubscribe on logout failed:', e);
    }
    localStorage.removeItem('thecarepal_token');
    localStorage.removeItem('carepal_token');
    setUser(null);
    setToken('');
    setPatients([]);
    setCurrentPatient(null);
    setPendingRequests([]);
    setPendingApprovals([]);
    setOverdueAlerts([]);
    alertedOverdueRef.current.clear();
  };

  const handlePatientLinked = (patientOrPending) => {
    if (patientOrPending.pending) {
      setPendingApprovals((prev) => {
        const exists = prev.find((p) => String(p._id) === String(patientOrPending._id));
        if (exists) return prev;
        return [...prev, patientOrPending];
      });
      setLiveAlert({
        type: 'info',
        message: patientOrPending.message || 'Request sent to family! You will get access as soon as they approve.',
      });
      return;
    }

    setPatients((prev) => {
      const exists = prev.find((p) => String(p._id) === String(patientOrPending._id));
      if (exists) return prev;
      return [...prev, patientOrPending];
    });
    setCurrentPatient(patientOrPending);
  };

  // Family actions to approve / reject incoming access requests
  const handleApproveAccessRequest = async (patientId, userId) => {
    try {
      await api.post(`/patients/${patientId}/requests/${userId}/approve`);
      setPendingRequests((prev) =>
        prev.filter(
          (r) =>
            !(
              String(r.patientId) === String(patientId) &&
              String(r.request?.userId) === String(userId)
            )
        )
      );
      setLiveAlert({
        type: 'success',
        message: 'Caregiver access approved successfully.',
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve caregiver access');
    }
  };

  const handleRejectAccessRequest = async (patientId, userId) => {
    try {
      await api.post(`/patients/${patientId}/requests/${userId}/reject`);
      setPendingRequests((prev) =>
        prev.filter(
          (r) =>
            !(
              String(r.patientId) === String(patientId) &&
              String(r.request?.userId) === String(userId)
            )
        )
      );
      setLiveAlert({
        type: 'info',
        message: 'Caregiver access request rejected.',
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject caregiver access');
    }
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
        onOpenProfile={() => {
          setIsFirstTimeProfile(false);
          setIsProfileModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Automatic Overdue Medication Watcher Banners */}
        {overdueAlerts && overdueAlerts.length > 0 && (
          <div className="space-y-2 mb-3">
            {overdueAlerts.map((alertItem) => (
              <div
                key={alertItem.key}
                className="py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-950 shadow-xs flex items-center justify-between gap-2 animate-in fade-in"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                  </div>
                  <p className="text-xs font-semibold text-amber-950 font-heading min-w-0 truncate">
                    {alertItem.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOverdueAlerts((prev) => prev.filter((a) => a.key !== alertItem.key))
                  }
                  className="p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-200/50 min-w-[24px] min-h-[24px] flex items-center justify-center rounded shrink-0 text-xs font-bold transition-colors"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Family View: Real-Time Incoming Caregiver Approval Request Banners */}
        {user.role === 'family' &&
          pendingRequests.map((reqItem) => (
            <div
              key={`req-${reqItem.patientId}-${reqItem.request?.userId}`}
              className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-slate-800 shadow-md animate-in fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full font-heading">
                      Access Requested
                    </span>
                    <span className="text-xs text-slate-600 font-medium truncate">
                      for <strong className="text-slate-900">{reqItem.patientName}</strong>
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#101820] font-heading mt-0.5 truncate">
                    {reqItem.request?.name}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({reqItem.request?.email})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleApproveAccessRequest(reqItem.patientId, reqItem.request?.userId)
                  }
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 min-h-[42px] font-heading active:scale-95 transition-all shadow-sm"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleRejectAccessRequest(reqItem.patientId, reqItem.request?.userId)
                  }
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 min-h-[42px] font-heading active:scale-95 transition-all"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPendingRequests((prev) =>
                      prev.filter(
                        (r) =>
                          !(
                            String(r.patientId) === String(reqItem.patientId) &&
                            String(r.request?.userId) === String(reqItem.request?.userId)
                          )
                      )
                    )
                  }
                  className="p-2 text-slate-400 hover:text-slate-600 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full shrink-0"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

        {/* Real-time Care Team & Access Alert Banner */}
        {liveAlert && (
          <div
            className={`mb-4 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in shadow-sm ${
              liveAlert.type === 'revoked'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : liveAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-[#3fb6ad]/15 text-[#04302c] border border-[#3fb6ad]/30'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  liveAlert.type === 'revoked'
                    ? 'bg-red-500'
                    : liveAlert.type === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-[#3fb6ad] animate-pulse'
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

        {/* Dedicated "Select Profile" Screen or Patient Care Dashboard */}
        {!currentPatient ? (
          <SelectProfileView
            user={user}
            patients={patients}
            pendingApprovals={pendingApprovals}
            onSelectPatient={(p) => setCurrentPatient(p)}
            onOpenPairModal={() => setIsPairModalOpen(true)}
            onOpenProfile={() => {
              setIsFirstTimeProfile(false);
              setIsProfileModalOpen(true);
            }}
            onEditPatient={(pat) => setEditingPatient(pat)}
          />
        ) : (
          <>
            {/* Patient Context Banner with 1-Click Copyable 6-digit Code */}
            <PatientBanner
              patient={currentPatient}
              patientsList={patients}
              onSelectPatient={(p) => setCurrentPatient(p)}
              onBackToProfiles={() => setCurrentPatient(null)}
              onOpenPairModal={() => setIsPairModalOpen(true)}
              userRole={user.role}
              onEditPatient={(pat) => setEditingPatient(pat)}
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
                key={`caretaker-${currentPatient?._id}`}
                patient={currentPatient}
                user={user}
                refreshTrigger={refreshTrigger}
              />
            ) : (
              <FamilyView
                key={`family-${currentPatient?._id}`}
                patient={currentPatient}
                user={user}
                refreshTrigger={refreshTrigger}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 sm:py-5 border-t border-[#e6ecf1] bg-white text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-center">
          <p className="font-heading text-slate-700">TheCarePal MedSync • Trusted Care at Home</p>
        </div>
      </footer>

      {/* 6-Digit Pairing & Patient Creation Modal */}
      <PairPatientModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onPatientLinked={handlePatientLinked}
        userRole={user.role}
        user={user}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setIsFirstTimeProfile(false);
        }}
        user={user}
        patients={patients}
        activePatient={currentPatient}
        onLogout={handleLogout}
        onPatientSaved={(savedPatient) => {
          setPatients((prev) => {
            const exists = prev.some((p) => String(p._id) === String(savedPatient._id));
            if (exists) {
              return prev.map((p) => (String(p._id) === String(savedPatient._id) ? savedPatient : p));
            }
            return [...prev, savedPatient];
          });
          if (currentPatient && String(currentPatient._id) === String(savedPatient._id)) {
            setCurrentPatient(savedPatient);
          }
          setRefreshTrigger((prev) => prev + 1);
        }}
        onUpdateUser={(updatedUser) => {
          setUser(updatedUser);
          localStorage.setItem('thecarepal_user', JSON.stringify(updatedUser));
        }}
        isFirstTimePrompt={isFirstTimeProfile}
      />

      {/* Edit Patient Details Modal */}
      <EditPatientModal
        isOpen={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        patient={editingPatient}
        onPatientUpdated={(updated) => {
          setPatients((prev) =>
            prev.map((p) => (String(p._id) === String(updated._id) ? updated : p))
          );
          if (currentPatient && String(currentPatient._id) === String(updated._id)) {
            setCurrentPatient(updated);
          }
          setRefreshTrigger((prev) => prev + 1);
          setEditingPatient(null);
        }}
      />
    </div>
  );
}
