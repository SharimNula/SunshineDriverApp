export type UserRole = 'Driver' | 'Guide' | 'Dispatcher' | 'Supervisor' | 'Ops Lead';

export type PresenceState = 'sharing' | 'paused' | 'offline';

export type PermissionState = 'idle' | 'granted' | 'denied';

export type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  address: string | null;
  updatedAt: string;
  source: 'gps';
};

export type TeamMember = {
  id: string;
  name: string;
  role: UserRole;
  accent: string;
  status: PresenceState;
  vehicleName: string | null;
  location: LocationPoint | null;
  lastNote: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shiftLabel: string;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  tone: 'user' | 'system';
};

export type SharedFile = {
  id: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  uri: string;
  note: string;
  sharedBy: string;
  sharedById: string;
  sharedAt: string;
};

