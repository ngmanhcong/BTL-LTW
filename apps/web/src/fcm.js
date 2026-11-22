import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: 'backbook-370316.firebaseapp.com',
  projectId: 'backbook-370316',
  storageBucket: 'backbook-370316.appspot.com',
  messagingSenderId: '398150721140',
  appId: '1:398150721140:web:d93f0193496929a5037b21',
  measurementId: 'G-VVEDB7NXXQ',
};

export const app =
  process.env.REACT_APP_ENABLE_FIREBASE === 'true' && firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
export const messaging = app ? getMessaging(app) : null;
