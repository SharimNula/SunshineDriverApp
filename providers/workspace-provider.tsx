import * as Location from 'expo-location';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  firebaseAuth,
  firebaseConfigured,
  firebaseMissingKeys,
  firestore,
  firebaseStorage,
} from '@/firebase/client';
import {
  ChatMessage,
  PermissionState,
  SessionUser,
  SharedFile,
  TeamMember,
  UserRole,
} from '@/types/relay';

type EmailSignInInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type ShareFileInput = {
  name: string;
  size: number | null;
  mimeType: string | null;
  uri: string;
  note: string;
};

type UpdateProfileInput = {
  name: string;
  role: UserRole;
  shiftLabel: string;
};

type UpdateCredentialsInput = {
  currentPassword: string;
  nextEmail: string;
  nextPassword: string;
};

type CredentialUpdateResult = {
  emailVerificationSent: boolean;
  passwordUpdated: boolean;
};

type WorkspaceContextValue = {
  session: SessionUser | null;
  teamMembers: TeamMember[];
  messages: ChatMessage[];
  sharedFiles: SharedFile[];
  sharingEnabled: boolean;
  permissionState: PermissionState;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  workspaceError: string | null;
  firebaseConfigured: boolean;
  firebaseMissingKeys: readonly string[];
  register: (input: RegisterInput) => Promise<boolean>;
  signIn: (input: EmailSignInInput) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfileInfo: (input: UpdateProfileInput) => Promise<boolean>;
  updateCredentials: (input: UpdateCredentialsInput) => Promise<CredentialUpdateResult | null>;
  setSharingEnabled: (value: boolean) => Promise<void>;
  setVehicleAssignment: (vehicleName: string | null) => Promise<void>;
  sendMessage: (body: string) => Promise<boolean>;
  shareFile: (input: ShareFileInput) => Promise<boolean>;
};

type UserProfileRecord = {
  name: string;
  email: string;
  role: UserRole;
  shiftLabel: string;
  accent: string;
};

type ResolvedAddress = {
  label: string | null;
  latitude: number;
  longitude: number;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const ROOM_ID = 'sunshine-relay';
const DEFAULT_SHIFT_LABEL = 'Active Shift';
const ROLE_ACCENTS: Record<UserRole, string> = {
  Driver: '#FF7A59',
  Guide: '#9FE2C0',
  Dispatcher: '#F7A531',
  Supervisor: '#6ED0FF',
  'Ops Lead': '#BFE87D',
};

function toUserRole(value: unknown): UserRole {
  if (value === 'Guide' || value === 'Dispatcher' || value === 'Supervisor' || value === 'Ops Lead') {
    return value;
  }

  return 'Driver';
}

function toIsoString(value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return new Date().toISOString();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFallbackProfile(
  user: FirebaseUser,
  overrides: Partial<Pick<UserProfileRecord, 'name' | 'email' | 'role'>> = {}
): UserProfileRecord {
  const defaultNameSource =
    user.displayName || user.email?.split('@')[0] || user.phoneNumber || 'Sunshine Operator';
  const fallbackName = titleCase(defaultNameSource.replace(/[._-]+/g, ' '));
  const role = overrides.role ?? 'Driver';

  return {
    name: overrides.name?.trim() || fallbackName,
    email: overrides.email ?? user.email ?? user.phoneNumber ?? '',
    role,
    shiftLabel: DEFAULT_SHIFT_LABEL,
    accent: ROLE_ACCENTS[role],
  };
}

function friendlyAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already in use. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Those credentials did not match an existing account.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/missing-password':
      return 'Enter your password to continue.';
    case 'auth/requires-recent-login':
      return 'Confirm your current password and try again.';
    case 'auth/too-many-requests':
      return 'Too many authentication attempts were made. Please wait a bit and try again.';
    default:
      return 'Firebase could not complete that request right now.';
  }
}

function resetWorkspaceState(
  setSession: (value: SessionUser | null) => void,
  setTeamMembers: (value: TeamMember[]) => void,
  setMessages: (value: ChatMessage[]) => void,
  setSharedFiles: (value: SharedFile[]) => void,
  setSharingEnabledState: (value: boolean) => void,
  setPermissionState: (value: PermissionState) => void,
  setWorkspaceError: (value: string | null) => void
) {
  setSession(null);
  setTeamMembers([]);
  setMessages([]);
  setSharedFiles([]);
  setSharingEnabledState(false);
  setPermissionState('idle');
  setWorkspaceError(null);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function formatPhysicalAddress(address: Location.LocationGeocodedAddress | null | undefined) {
  if (!address) {
    return null;
  }

  const streetLine = [address.streetNumber, address.street].filter(Boolean).join(' ').trim();
  const localityLine = [address.city ?? address.district, address.region, address.postalCode]
    .filter(Boolean)
    .join(' ')
    .trim();
  const primary = [streetLine, localityLine].filter(Boolean).join(', ');

  if (primary) {
    return primary;
  }

  const fallback = [address.name, address.subregion, address.country]
    .filter(Boolean)
    .join(', ')
    .trim();

  return fallback || null;
}

function canReuseResolvedAddress(
  coords: Location.LocationObjectCoords,
  cached: ResolvedAddress | null
) {
  if (!cached) {
    return false;
  }

  return (
    Math.abs(coords.latitude - cached.latitude) < 0.0006 &&
    Math.abs(coords.longitude - cached.longitude) < 0.0006
  );
}

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [sharingEnabled, setSharingEnabledState] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const workspaceListenersRef = useRef<Array<() => void>>([]);
  const resolvedAddressRef = useRef<ResolvedAddress | null>(null);

  function stopLocationFeed() {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    resolvedAddressRef.current = null;
  }

  function clearWorkspaceListeners() {
    workspaceListenersRef.current.forEach((unsubscribe) => unsubscribe());
    workspaceListenersRef.current = [];
  }

  async function ensureUserProfile(
    user: FirebaseUser,
    overrides: Partial<Pick<UserProfileRecord, 'name' | 'email' | 'role'>> = {}
  ) {
    const activeFirestore = firestore;

    if (!activeFirestore) {
      return buildFallbackProfile(user, overrides);
    }

    const fallback = buildFallbackProfile(user, overrides);
    const profileRef = doc(activeFirestore, 'users', user.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      await setDoc(
        profileRef,
        {
          name: fallback.name,
          email: fallback.email,
          role: fallback.role,
          shiftLabel: fallback.shiftLabel,
          accent: fallback.accent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return fallback;
    }

    const data = profileSnapshot.data();
    const role = toUserRole(data.role);
    const nextProfile = {
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : fallback.name,
      email: fallback.email || (typeof data.email === 'string' && data.email.trim() ? data.email.trim() : ''),
      role,
      shiftLabel:
        typeof data.shiftLabel === 'string' && data.shiftLabel.trim()
          ? data.shiftLabel.trim()
          : DEFAULT_SHIFT_LABEL,
      accent: typeof data.accent === 'string' && data.accent.trim() ? data.accent : ROLE_ACCENTS[role],
    };

    await setDoc(
      profileRef,
      {
        ...nextProfile,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return nextProfile;
  }

  async function syncMemberDocument(userId: string, profile: UserProfileRecord, overrides: Record<string, unknown> = {}) {
    const activeFirestore = firestore;

    if (!activeFirestore) {
      return;
    }

    await setDoc(
      doc(activeFirestore, 'rooms', ROOM_ID, 'members', userId),
      {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        accent: profile.accent,
        shiftLabel: profile.shiftLabel,
        status: 'paused',
        sharingEnabled: false,
        location: null,
        lastNote: '',
        updatedAt: serverTimestamp(),
        ...overrides,
      },
      { merge: true }
    );
  }

  async function announceActivityMessage(body: string) {
    const activeFirestore = firestore;
    const activeUser = firebaseAuth?.currentUser;

    if (!activeFirestore || !activeUser) {
      return;
    }

    await addDoc(collection(activeFirestore, 'rooms', ROOM_ID, 'messages'), {
      authorId: activeUser.uid,
      authorName:
        activeUser.displayName || activeUser.email || activeUser.phoneNumber || 'Sunshine Operator',
      body,
      tone: 'user',
      createdAt: serverTimestamp(),
    });
  }

  async function register(input: RegisterInput) {
    const activeAuth = firebaseAuth;
    const activeFirestore = firestore;

    if (!firebaseConfigured || !activeAuth || !activeFirestore) {
      setAuthError('Add your Firebase config values before creating an account.');
      return false;
    }

    const name = input.name.trim() || 'Sunshine Operator';
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    setAuthBusy(true);
    setAuthError(null);

    try {
      const credential = await createUserWithEmailAndPassword(activeAuth, email, password);
      await updateProfile(credential.user, { displayName: name });

      const profile = {
        name,
        email: credential.user.email ?? email,
        role: input.role,
        shiftLabel: DEFAULT_SHIFT_LABEL,
        accent: ROLE_ACCENTS[input.role],
      };

      await setDoc(
        doc(activeFirestore, 'users', credential.user.uid),
        {
          ...profile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await syncMemberDocument(credential.user.uid, profile);
      await announceActivityMessage(`${profile.name} joined the workspace.`);
      return true;
    } catch (error) {
      setAuthError(friendlyAuthError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function signIn(input: EmailSignInInput) {
    const activeAuth = firebaseAuth;

    if (!firebaseConfigured || !activeAuth) {
      setAuthError('Add your Firebase config values before signing in.');
      return false;
    }

    const email = input.email.trim().toLowerCase();
    const password = input.password;

    setAuthBusy(true);
    setAuthError(null);

    try {
      const credential = await signInWithEmailAndPassword(activeAuth, email, password);
      const profile = await ensureUserProfile(credential.user);
      await syncMemberDocument(credential.user.uid, profile);
      return true;
    } catch (error) {
      setAuthError(friendlyAuthError(error));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateProfileInfo(input: UpdateProfileInput) {
    const activeAuth = firebaseAuth;
    const activeFirestore = firestore;
    const activeUser = activeAuth?.currentUser;

    if (!session || !activeUser || !activeFirestore) {
      setAuthError('Sign in again before updating your profile.');
      return false;
    }

    const name = input.name.trim() || session.name;
    const role = input.role;
    const shiftLabel = input.shiftLabel.trim() || DEFAULT_SHIFT_LABEL;
    const accent = ROLE_ACCENTS[role];

    setAuthBusy(true);
    setAuthError(null);

    try {
      await updateProfile(activeUser, { displayName: name });
      await setDoc(
        doc(activeFirestore, 'users', session.id),
        {
          name,
          email: session.email,
          role,
          shiftLabel,
          accent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
        {
          name,
          email: session.email,
          role,
          shiftLabel,
          accent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch {
      setAuthError('Your profile could not be updated right now.');
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateCredentials(input: UpdateCredentialsInput) {
    const activeAuth = firebaseAuth;
    const activeFirestore = firestore;
    const activeUser = activeAuth?.currentUser;

    if (!session || !activeUser || !activeFirestore) {
      setAuthError('Sign in again before updating your account credentials.');
      return null;
    }

    const currentEmail = activeUser.email ?? session.email;
    const currentPassword = input.currentPassword;
    const nextEmail = input.nextEmail.trim().toLowerCase();
    const nextPassword = input.nextPassword;
    const emailVerificationSent = nextEmail.length > 0 && nextEmail !== currentEmail;
    const passwordUpdated = nextPassword.length > 0;

    if (!emailVerificationSent && !passwordUpdated) {
      setAuthError('Enter a new email or password before saving account credentials.');
      return null;
    }

    if (!currentPassword) {
      setAuthError('Enter your current password to update email or password.');
      return null;
    }

    if (passwordUpdated && nextPassword.length < 6) {
      setAuthError('Choose a password with at least 6 characters.');
      return null;
    }

    setAuthBusy(true);
    setAuthError(null);

    try {
      const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
      await reauthenticateWithCredential(activeUser, credential);

      if (emailVerificationSent) {
        await verifyBeforeUpdateEmail(activeUser, nextEmail);
      }

      if (passwordUpdated) {
        await updatePassword(activeUser, nextPassword);
      }

      if (!emailVerificationSent) {
        await setDoc(
          doc(activeFirestore, 'users', session.id),
          {
            email: currentEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await setDoc(
          doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
          {
            email: currentEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        emailVerificationSent,
        passwordUpdated,
      };
    } catch (error) {
      setAuthError(friendlyAuthError(error));
      return null;
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    const activeAuth = firebaseAuth;
    const activeFirestore = firestore;

    stopLocationFeed();

    if (session && activeFirestore) {
      try {
        await setDoc(
          doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
          {
            status: 'offline',
            sharingEnabled: false,
            location: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        setWorkspaceError('Signed out, but your offline status could not be synced to Firestore.');
      }
    }

    if (!activeAuth) {
      return;
    }

    try {
      await firebaseSignOut(activeAuth);
    } catch {
      setAuthError('Sign out could not be completed right now.');
    }
  }

  async function setVehicleAssignment(vehicleName: string | null) {
    const activeFirestore = firestore;

    if (!session || !activeFirestore) {
      return;
    }

    try {
      setWorkspaceError(null);
      await setDoc(
        doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
        {
          vehicleName: vehicleName?.trim() || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      setWorkspaceError('Vehicle assignment could not be saved right now.');
    }
  }

  async function setSharingEnabled(nextValue: boolean) {
    const activeFirestore = firestore;

    if (!session || !activeFirestore) {
      return;
    }

    setWorkspaceError(null);
    setSharingEnabledState(nextValue);

    if (!nextValue) {
      stopLocationFeed();
      setPermissionState('idle');
      await setDoc(
        doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
        {
          status: 'paused',
          sharingEnabled: false,
          location: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    await setDoc(
      doc(activeFirestore, 'rooms', ROOM_ID, 'members', session.id),
      {
        status: 'paused',
        sharingEnabled: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function sendMessage(body: string) {
    const activeFirestore = firestore;

    if (!session || !activeFirestore) {
      return false;
    }

    if (session.role === 'Driver') {
      setWorkspaceError('Drivers have read-only access to shift chat.');
      return false;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return false;
    }

    try {
      setWorkspaceError(null);
      await addDoc(collection(activeFirestore, 'rooms', ROOM_ID, 'messages'), {
        authorId: session.id,
        authorName: session.name,
        body: trimmedBody,
        tone: 'user',
        createdAt: serverTimestamp(),
      });
      return true;
    } catch {
      setWorkspaceError('Message could not be sent right now.');
      return false;
    }
  }

  async function shareFile(input: ShareFileInput) {
    const activeFirestore = firestore;
    const activeStorage = firebaseStorage;

    if (!session || !activeFirestore || !activeStorage) {
      return false;
    }

    if (session.role === 'Driver') {
      setWorkspaceError('Drivers have read-only access to the shared file library.');
      return false;
    }

    try {
      setWorkspaceError(null);

      const fileResponse = await fetch(input.uri);
      const fileBlob = await fileResponse.blob();
      const storagePath = `rooms/${ROOM_ID}/files/${session.id}/${Date.now()}-${sanitizeFileName(input.name)}`;
      const storageRef = ref(activeStorage, storagePath);

      await uploadBytes(storageRef, fileBlob, {
        contentType: input.mimeType ?? 'application/octet-stream',
      });

      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(activeFirestore, 'rooms', ROOM_ID, 'files'), {
        name: input.name,
        size: input.size,
        mimeType: input.mimeType,
        uri: downloadURL,
        storagePath,
        note: input.note.trim() || 'Shared without an additional note.',
        sharedBy: session.name,
        sharedById: session.id,
        sharedAt: serverTimestamp(),
      });

      await announceActivityMessage(`${session.name} shared ${input.name}.`);
      return true;
    } catch {
      setWorkspaceError('File upload failed. Check Firebase Storage and try again.');
      return false;
    }
  }

  useEffect(() => {
    const activeAuth = firebaseAuth;
    const activeFirestore = firestore;

    if (!firebaseConfigured || !activeAuth || !activeFirestore) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(activeAuth, async (user) => {
      clearWorkspaceListeners();
      stopLocationFeed();
      setWorkspaceError(null);
      setPermissionState('idle');

      if (!user) {
        resetWorkspaceState(
          setSession,
          setTeamMembers,
          setMessages,
          setSharedFiles,
          setSharingEnabledState,
          setPermissionState,
          setWorkspaceError
        );
        setAuthReady(true);
        return;
      }

      setAuthReady(false);

      try {
        const profile = await ensureUserProfile(user);
        await syncMemberDocument(user.uid, profile);
        setSession({
          id: user.uid,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          shiftLabel: profile.shiftLabel,
        });

        const nextListeners: Array<() => void> = [];

        nextListeners.push(
          onSnapshot(
            doc(activeFirestore, 'users', user.uid),
            (snapshot) => {
              if (!snapshot.exists()) {
                return;
              }

              const data = snapshot.data();
              const role = toUserRole(data.role);

              setSession({
                id: user.uid,
                name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : profile.name,
                email:
                  typeof data.email === 'string' && data.email.trim() ? data.email.trim() : profile.email,
                role,
                shiftLabel:
                  typeof data.shiftLabel === 'string' && data.shiftLabel.trim()
                    ? data.shiftLabel.trim()
                    : DEFAULT_SHIFT_LABEL,
              });
            },
            () => {
              setWorkspaceError('User profile could not be refreshed from Firestore.');
            }
          )
        );

        nextListeners.push(
          onSnapshot(
            query(collection(activeFirestore, 'rooms', ROOM_ID, 'members'), orderBy('updatedAt', 'desc')),
            (snapshot) => {
              const members = snapshot.docs.map((entry) => {
                const data = entry.data();
                const role = toUserRole(data.role);
                const location =
                  data.location &&
                  typeof data.location.latitude === 'number' &&
                  typeof data.location.longitude === 'number'
                    ? {
                        latitude: data.location.latitude,
                        longitude: data.location.longitude,
                        accuracy:
                          typeof data.location.accuracy === 'number' ? data.location.accuracy : null,
                        heading:
                          typeof data.location.heading === 'number' ? data.location.heading : null,
                        speed: typeof data.location.speed === 'number' ? data.location.speed : null,
                        address:
                          typeof data.location.address === 'string' && data.location.address.trim()
                            ? data.location.address.trim()
                            : null,
                        updatedAt: toIsoString(data.location.updatedAt ?? data.updatedAt),
                        source: 'gps' as const,
                      }
                    : null;

                return {
                  id: entry.id,
                  name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Unnamed user',
                  role,
                  accent:
                    typeof data.accent === 'string' && data.accent.trim() ? data.accent : ROLE_ACCENTS[role],
                  status:
                    data.status === 'sharing'
                      ? 'sharing'
                      : data.status === 'offline'
                        ? 'offline'
                        : 'paused',
                  vehicleName:
                    typeof data.vehicleName === 'string' && data.vehicleName.trim()
                      ? data.vehicleName.trim()
                      : null,
                  location,
                  lastNote: typeof data.lastNote === 'string' ? data.lastNote : '',
                } satisfies TeamMember;
              });

              const currentMemberSnapshot = snapshot.docs.find((entry) => entry.id === user.uid);
              if (currentMemberSnapshot) {
                const currentData = currentMemberSnapshot.data();
                setSharingEnabledState(Boolean(currentData.sharingEnabled));
              }

              setTeamMembers(members);
            },
            () => {
              setWorkspaceError('Team presence could not be loaded from Firestore.');
            }
          )
        );

        nextListeners.push(
          onSnapshot(
            query(collection(activeFirestore, 'rooms', ROOM_ID, 'messages'), orderBy('createdAt', 'asc')),
            (snapshot) => {
              setMessages(
                snapshot.docs.map((entry) => {
                  const data = entry.data();

                  return {
                    id: entry.id,
                    authorId:
                      typeof data.authorId === 'string' && data.authorId.trim() ? data.authorId : 'system',
                    authorName:
                      typeof data.authorName === 'string' && data.authorName.trim()
                        ? data.authorName
                        : 'Sunshine Relay',
                    body: typeof data.body === 'string' ? data.body : '',
                    createdAt: toIsoString(data.createdAt),
                    tone: data.tone === 'user' ? 'user' : 'system',
                  } satisfies ChatMessage;
                })
              );
            },
            () => {
              setWorkspaceError('Chat could not be loaded from Firestore.');
            }
          )
        );

        nextListeners.push(
          onSnapshot(
            query(collection(activeFirestore, 'rooms', ROOM_ID, 'files'), orderBy('sharedAt', 'desc')),
            (snapshot) => {
              setSharedFiles(
                snapshot.docs.map((entry) => {
                  const data = entry.data();

                  return {
                    id: entry.id,
                    name: typeof data.name === 'string' ? data.name : 'Untitled file',
                    size: typeof data.size === 'number' ? data.size : null,
                    mimeType: typeof data.mimeType === 'string' ? data.mimeType : null,
                    uri: typeof data.uri === 'string' ? data.uri : '',
                    note: typeof data.note === 'string' ? data.note : '',
                    sharedBy: typeof data.sharedBy === 'string' ? data.sharedBy : 'Unknown user',
                    sharedById: typeof data.sharedById === 'string' ? data.sharedById : '',
                    sharedAt: toIsoString(data.sharedAt),
                  } satisfies SharedFile;
                })
              );
            },
            () => {
              setWorkspaceError('Shared files could not be loaded from Firebase.');
            }
          )
        );

        workspaceListenersRef.current = nextListeners;
      } catch {
        setWorkspaceError('Firebase could not load the workspace right now.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribe();
      clearWorkspaceListeners();
      stopLocationFeed();
    };
  }, []);

  useEffect(() => {
    const activeFirestore = firestore;
    const activeSessionId = session?.id;

    if (!activeSessionId || !sharingEnabled || !activeFirestore) {
      stopLocationFeed();
      return;
    }

    const locationDb = activeFirestore;
    const memberId = activeSessionId;
    let active = true;

    async function resolveLocationAddress(coords: Location.LocationObjectCoords) {
      if (canReuseResolvedAddress(coords, resolvedAddressRef.current)) {
        return resolvedAddressRef.current?.label ?? null;
      }

      try {
        const [result] = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const label = formatPhysicalAddress(result);
        resolvedAddressRef.current = {
          label,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        return label;
      } catch {
        return resolvedAddressRef.current?.label ?? null;
      }
    }

    async function persistLocation(coords: Location.LocationObjectCoords) {
      const address = await resolveLocationAddress(coords);
      const locationUpdatedAt = new Date().toISOString();

      await setDoc(
        doc(locationDb, 'rooms', ROOM_ID, 'members', memberId),
        {
          status: 'sharing',
          sharingEnabled: true,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            heading: coords.heading ?? null,
            speed: coords.speed ?? null,
            address,
            updatedAt: locationUpdatedAt,
            source: 'gps',
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    async function beginSharing() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!active) {
          return;
        }

        if (permission.status !== 'granted') {
          setPermissionState('denied');
          setSharingEnabledState(false);
          await setDoc(
            doc(locationDb, 'rooms', ROOM_ID, 'members', memberId),
            {
              status: 'paused',
              sharingEnabled: false,
              location: null,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          return;
        }

        setPermissionState('granted');
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (currentPosition && active) {
          await persistLocation(currentPosition.coords);
        }

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5_000,
            distanceInterval: 10,
          },
          (position) => {
            void persistLocation(position.coords);
          }
        );

        if (!active) {
          subscription.remove();
          return;
        }

        locationSubscriptionRef.current = subscription;
      } catch {
        if (!active) {
          return;
        }

        setWorkspaceError('Live location could not be synced to Firestore.');
        setSharingEnabledState(false);
        await setDoc(
          doc(locationDb, 'rooms', ROOM_ID, 'members', memberId),
          {
            status: 'paused',
            sharingEnabled: false,
            location: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    void beginSharing();

    return () => {
      active = false;
      stopLocationFeed();
    };
  }, [session?.id, sharingEnabled]);

  return (
    <WorkspaceContext.Provider
      value={{
        session,
        teamMembers,
        messages,
        sharedFiles,
        sharingEnabled,
        permissionState,
        authReady,
        authBusy,
        authError,
        workspaceError,
        firebaseConfigured,
        firebaseMissingKeys,
        register,
        signIn,
        signOut,
        updateProfileInfo,
        updateCredentials,
        setSharingEnabled,
        setVehicleAssignment,
        sendMessage,
        shareFile,
      }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return context;
}
























