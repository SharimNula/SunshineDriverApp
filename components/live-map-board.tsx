import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { TeamMember } from '@/types/relay';
import { formatCoordinates, formatRelativeTime } from '@/utils/formatters';
import {
  getLiveMapLatestUpdate,
  getLiveMapMarkerLabel,
  getLiveMapMembers,
} from '@/utils/live-map';

type LiveMapBoardProps = {
  members: TeamMember[];
  currentUserId?: string;
};

export function LiveMapBoard({ members, currentUserId }: LiveMapBoardProps) {
  const vehicleMarkers = getLiveMapMembers(members);

  if (!vehicleMarkers.length) {
    return (
      <View style={styles.board}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Vehicle Map</Text>
          <Text style={styles.subtitle}>No active driver or guide markers</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.caption}>
            Driver and guide markers appear here when live location sharing is active.
          </Text>
        </View>
      </View>
    );
  }

  const latestUpdate = getLiveMapLatestUpdate(vehicleMarkers);

  return (
    <View style={styles.board}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Vehicle Map</Text>
        <Text style={styles.subtitle}>{vehicleMarkers.length} active markers</Text>
      </View>

      <View style={styles.noticeCard}>
        <MaterialIcons name="map" size={18} color={AppTheme.accentSoft} />
        <Text style={styles.noticeText}>
          Native iOS and Android builds show the real-time map. This web view mirrors the active
          vehicle marker feed.
        </Text>
      </View>

      <View style={styles.list}>
        {vehicleMarkers.map((member) => (
          <View key={member.id} style={styles.driverCard}>
            <View style={styles.driverTop}>
              <View style={styles.driverNameRow}>
                <View style={[styles.driverAccent, { backgroundColor: member.accent }]} />
                <Text style={styles.driverName}>
                  {getLiveMapMarkerLabel(member)}
                  {member.id === currentUserId ? ' (You)' : ''}
                </Text>
              </View>
              <Text style={styles.driverMeta}>{formatRelativeTime(member.location.updatedAt)}</Text>
            </View>

            <Text style={styles.driverAddress}>
              {member.location.address ?? 'Address unavailable'}
            </Text>
            <Text style={styles.driverMeta}>
              {formatCoordinates(member.location.latitude, member.location.longitude)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.caption}>Updated {formatRelativeTime(latestUpdate)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: AppTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: AppTheme.mutedText,
    fontSize: 12,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    padding: 14,
  },
  noticeText: {
    flex: 1,
    color: AppTheme.text,
    fontSize: 13,
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  driverCard: {
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    padding: 14,
  },
  driverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverAccent: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  driverName: {
    flex: 1,
    color: AppTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  driverAddress: {
    color: AppTheme.text,
    fontSize: 13,
    lineHeight: 19,
  },
  driverMeta: {
    color: AppTheme.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    color: AppTheme.mutedText,
    fontSize: 12,
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: '#081B22',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
