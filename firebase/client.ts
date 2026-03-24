import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const parseBoolean = (value: string | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const parsePort = (value: string | undefined, fallback: number) => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 ? port : fallback;
};

const defaultEmulatorHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

export const firebaseMissingKeys = requiredKeys.filter((key) => {
  switch (key) {
    case 'EXPO_PUBLIC_FIREBASE_API_KEY':
      return !firebaseConfig.apiKey;
    case 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN':
      return !firebaseConfig.authDomain;
    case 'EXPO_PUBLIC_FIREBASE_PROJECT_ID':
      return !firebaseConfig.projectId;
    case 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET':
      return !firebaseConfig.storageBucket;
    case 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID':
      return !firebaseConfig.messagingSenderId;
    case 'EXPO_PUBLIC_FIREBASE_APP_ID':
      return !firebaseConfig.appId;
    default:
      return true;
  }
});

export const firebaseConfigured = firebaseMissingKeys.length === 0;
export const firebaseUseEmulators = parseBoolean(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS);
export const firebaseEmulatorHost = (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? defaultEmulatorHost)
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');
export const firebaseEmulatorPorts = {
  auth: parsePort(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT, 9099),
  firestore: parsePort(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_PORT, 8080),
  storage: parsePort(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT, 9199),
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestore: Firestore | null = null;
let firebaseStorage: FirebaseStorage | null = null;

const emulatorRuntime = globalThis as typeof globalThis & {
  __sunshineDriverFirebaseEmulatorsConnected?: boolean;
};

if (firebaseConfigured) {
  firebaseApp = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey!,
        authDomain: firebaseConfig.authDomain!,
        projectId: firebaseConfig.projectId!,
        storageBucket: firebaseConfig.storageBucket!,
        messagingSenderId: firebaseConfig.messagingSenderId!,
        appId: firebaseConfig.appId!,
      });

  firebaseAuth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  firebaseStorage = getStorage(firebaseApp);

  if (firebaseUseEmulators && !emulatorRuntime.__sunshineDriverFirebaseEmulatorsConnected) {
    connectAuthEmulator(
      firebaseAuth,
      `http://${firebaseEmulatorHost}:${firebaseEmulatorPorts.auth}`,
      { disableWarnings: true }
    );
    connectFirestoreEmulator(firestore, firebaseEmulatorHost, firebaseEmulatorPorts.firestore);
    connectStorageEmulator(firebaseStorage, firebaseEmulatorHost, firebaseEmulatorPorts.storage);
    emulatorRuntime.__sunshineDriverFirebaseEmulatorsConnected = true;
  }
}

export { firebaseApp, firebaseAuth, firestore, firebaseStorage };
