import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function initSocket() {
  return getSocket();
}

export function joinPatientRoom(patientId) {
  const s = getSocket();
  if (s && patientId) {
    s.emit('joinPatientRoom', patientId);
    s.emit('joinPatient', patientId);
  }
}

export function leavePatientRoom(patientId) {
  const s = getSocket();
  if (s && patientId) {
    s.emit('leavePatientRoom', patientId);
    s.emit('leavePatient', patientId);
  }
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
