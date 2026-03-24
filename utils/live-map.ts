import { TeamMember, UserRole } from '@/types/relay';

export type LiveMapMember = TeamMember & {
  location: NonNullable<TeamMember['location']>;
};

export const LIVE_MAP_ROLES: UserRole[] = ['Driver', 'Guide'];

export function isLiveMapRole(role: UserRole) {
  return LIVE_MAP_ROLES.includes(role);
}

export function getLiveMapMembers(members: TeamMember[]) {
  return members.filter(
    (member): member is LiveMapMember =>
      isLiveMapRole(member.role) && member.status === 'sharing' && Boolean(member.location)
  );
}

export function getLiveMapMarkerLabel(member: LiveMapMember) {
  const firstName = member.name.split(' ')[0] || member.name;
  return member.vehicleName ? `${firstName} | ${member.vehicleName}` : firstName;
}

export function getLiveMapMarkerTitle(member: LiveMapMember) {
  return member.vehicleName ? `${member.name} | ${member.vehicleName}` : member.name;
}

export function getLiveMapLatestUpdate(members: LiveMapMember[]) {
  return members.reduce((latest, member) => {
    return member.location.updatedAt > latest ? member.location.updatedAt : latest;
  }, members[0]?.location.updatedAt ?? new Date().toISOString());
}

export function getLiveMapCoordinateKey(members: LiveMapMember[]) {
  return members
    .map(
      (member) =>
        `${member.id}:${member.location.latitude.toFixed(5)}:${member.location.longitude.toFixed(5)}`
    )
    .join('|');
}
