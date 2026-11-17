import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const joinPatientRoom = (patientId) => {
  const s = getSocket();
  if (s && patientId) {
    s.emit('joinPatient', patientId);
  }
};

export const leavePatientRoom = (patientId) => {
  const s = getSocket();
  if (s && patientId) {
    s.emit('leavePatient', patientId);
  }
};
