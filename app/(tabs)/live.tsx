import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { LiveMapBoard } from '@/components/live-map-board';
import { Panel } from '@/components/panel';
import { StatusChip } from '@/components/status-chip';
import { AppTheme } from '@/constants/theme';
import { useWorkspace } from '@/providers/workspace-provider';
import { formatCoordinates, formatRelativeTime, formatSpeed } from '@/utils/formatters';
import { isLiveMapRole } from '@/utils/live-map';

function signalTone(permissionState: 'idle' | 'granted' | 'denied', sharingEnabled: boolean) {
  if (permissionState === 'denied') {
    return 'danger' as const;
  }

  if (sharingEnabled && permissionState === 'granted') {
    return 'positive' as const;
  }

  if (sharingEnabled) {
    return 'accent' as const;
  }

  return 'muted' as const;
}

function signalLabel(permissionState: 'idle' | 'granted' | 'denied', sharingEnabled: boolean) {
  if (permissionState === 'denied') {
    return 'Location blocked';
  }

  if (sharingEnabled && permissionState === 'granted') {
    return 'GPS live';
  }

  if (sharingEnabled) {
    return 'Connecting';
  }

  return 'Broadcast off';
}

// Add vehicle names here when the roster is ready.
const vehicleOptions: string[] = ['Van 1', 'Van 2', 'Van 3', 'Bus #22', 'Bus #33', 'Bus #44', 'Bus #66', 'Bus #071', 'Bus #072', 'Bus #77', 'Bus #88', 'Bus #111', 'Bus #131', 'Bus #132', 'Bus #161', 'Bus #162', 'Bus #171', 'Bus #172', 'Bus #241', 'Bus #242', 'Bus #279', 'Bus #333', 'Bus #444', 'Bus #555', 'Mini-Coach 1', 'Mini-Coach 2', 'Mini-Coach 3'];

export default function LiveScreen() {
  const router = useRouter();
  const {
    session,
    teamMembers,
    messages,
    sharedFiles,
    sharingEnabled,
    permissionState,
    workspaceError,
    setSharingEnabled,
    setVehicleAssignment,
    signOut,
  } = useWorkspace();

  if (!session) {
    return <Redirect href="/" />;
  }

  const currentUser = teamMembers.find((member) => member.id === session.id);
  const activeCount = teamMembers.filter((member) => member.status === 'sharing').length;
  const canAssignVehicle = isLiveMapRole(session.role);

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Dispatch Pulse</Text>
              <Text style={styles.title}>Live location visibility for {session.name}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  router.push('../profile');
                }}
                style={styles.ghostButton}>
                <MaterialIcons name="manage-accounts" size={18} color={AppTheme.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  void signOut();
                }}
                style={styles.ghostButton}>
                <MaterialIcons name="logout" size={18} color={AppTheme.text} />
              </Pressable>
            </View>
          </View>

          {workspaceError ? (
            <Panel style={styles.warningPanel}>
              <Text style={styles.warningText}>{workspaceError}</Text>
            </Panel>
          ) : null}

          <Panel style={styles.heroPanel}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <StatusChip
                  label={signalLabel(permissionState, sharingEnabled)}
                  tone={signalTone(permissionState, sharingEnabled)}
                />
                <Text style={styles.heroTitle}>Share your device location into the room.</Text>
                <Text style={styles.heroText}>
                  Press Start Sharing to publish your live location. You can disable sharing at any time, but keep in mind that location permissions will be required to share live location updates from your device.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void setSharingEnabled(!sharingEnabled);
                }}
                style={[styles.primaryToggle, !sharingEnabled ? styles.primaryToggleMuted : null]}>
                <Text style={styles.primaryToggleText}>
                  {sharingEnabled ? 'Stop sharing' : 'Start sharing'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{activeCount}</Text>
                <Text style={styles.statLabel}>Live broadcasters</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{messages.length}</Text>
                <Text style={styles.statLabel}>Room messages</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{sharedFiles.length}</Text>
                <Text style={styles.statLabel}>Cloud files</Text>
              </View>
            </View>

            {currentUser?.location ? (
              <View style={styles.userMeta}>
                <View style={styles.userMetaRow}>
                  <MaterialIcons name="place" size={18} color={AppTheme.accentSoft} />
                  <Text style={styles.userMetaText}>
                    {currentUser.location.address ?? 'Address unavailable'}
                  </Text>
                </View>
                <View style={styles.userMetaRow}>
                  <MaterialIcons name="person-pin-circle" size={18} color={AppTheme.accent} />
                  <Text style={styles.userMetaText}>
                    {formatCoordinates(currentUser.location.latitude, currentUser.location.longitude)}
                  </Text>
                </View>
                <View style={styles.userMetaRow}>
                  <MaterialIcons name="speed" size={18} color={AppTheme.sky} />
                  <Text style={styles.userMetaText}>{formatSpeed(currentUser.location.speed)}</Text>
                </View>
                <View style={styles.userMetaRow}>
                  <MaterialIcons name="schedule" size={18} color={AppTheme.success} />
                  <Text style={styles.userMetaText}>
                    Updated {formatRelativeTime(currentUser.location.updatedAt)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.waitingText}>
                {permissionState === 'denied'
                  ? 'Location permission is blocked. Turn it back on, then start sharing again.'
                  : 'Start sharing to publish your live device location.'}
              </Text>
            )}
          </Panel>

          {canAssignVehicle ? (
            <Panel style={styles.vehiclePanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Vehicle Assignment</Text>
                <Text style={styles.panelSubtitle}>
                  {currentUser?.vehicleName
                    ? `Assigned to ${currentUser.vehicleName}`
                    : 'Choose a vehicle for your live map marker'}
                </Text>
              </View>

              <Text style={styles.vehicleCurrentLabel}>Current vehicle</Text>
              <Text style={styles.vehicleCurrentValue}>
                {currentUser?.vehicleName ?? 'No vehicle selected'}
              </Text>

              {vehicleOptions.length ? (
                <View style={styles.vehicleSelectWrap}>
                  <Picker
                    dropdownIconColor={AppTheme.accentSoft}
                    onValueChange={(value) => {
                      void setVehicleAssignment(value || null);
                    }}
                    selectedValue={currentUser?.vehicleName ?? ''}
                    style={styles.vehicleSelect}>
                    <Picker.Item color={AppTheme.mutedText} label="Select a vehicle..." value="" />
                    {vehicleOptions.map((vehicleName) => (
                      <Picker.Item key={vehicleName} label={vehicleName} value={vehicleName} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.vehicleEmpty}>No vehicles have been added to this list yet.</Text>
              )}

              {currentUser?.vehicleName ? (
                <Pressable
                  onPress={() => {
                    void setVehicleAssignment(null);
                  }}
                  style={styles.clearVehicleButton}>
                  <Text style={styles.clearVehicleButtonText}>Clear vehicle</Text>
                </Pressable>
              ) : null}
            </Panel>
          ) : null}

          <Panel>
            <LiveMapBoard members={teamMembers} currentUserId={session.id} />
          </Panel>

          <Panel style={styles.teamPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Team Presence</Text>
              <Text style={styles.panelSubtitle}>Every row is streaming from the members collection</Text>
            </View>

            {teamMembers.length === 0 ? (
              <Text style={styles.emptyCopy}>No users are connected to this workspace yet.</Text>
            ) : null}

            {teamMembers.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberTop}>
                  <View style={styles.memberIdentity}>
                    <View style={[styles.avatar, { backgroundColor: member.accent }]}>
                      <Text style={styles.avatarLabel}>{member.name[0]}</Text>
                    </View>
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>
                        {member.name}
                        {member.id === session.id ? ' (You)' : ''}
                        {member.vehicleName ? ` | ${member.vehicleName}` : ''}
                      </Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                  </View>
                  <StatusChip
                    label={
                      member.status === 'sharing'
                        ? 'Live'
                        : member.status === 'offline'
                          ? 'Offline'
                          : 'Paused'
                    }
                    tone={member.status === 'sharing' ? 'positive' : 'muted'}
                  />
                </View>

                <Text style={styles.memberNote}>
                  {member.lastNote ||
                    (member.status === 'offline'
                      ? 'Not currently signed in.'
                      : member.location
                        ? 'Streaming live coordinates from Firebase.'
                        : 'No live location published yet.')}
                </Text>

                {member.location ? (
                  <View style={styles.memberLocationStack}>
                    <Text style={styles.memberAddress}>
                      {member.location.address ?? 'Address unavailable'}
                    </Text>
                    <View style={styles.memberMetaRow}>
                      <Text style={styles.memberMeta}>
                        {formatCoordinates(member.location.latitude, member.location.longitude)}
                      </Text>
                      <Text style={styles.memberMeta}>{formatSpeed(member.location.speed)}</Text>
                      <Text style={styles.memberMeta}>{formatRelativeTime(member.location.updatedAt)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.memberMeta}>Awaiting a location update.</Text>
                )}
              </View>
            ))}
          </Panel>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.canvas,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: AppTheme.accentSoft,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  ghostButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
  },
  warningPanel: {
    borderColor: 'rgba(255, 122, 89, 0.35)',
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
  },
  warningText: {
    color: '#FFE2D8',
    fontSize: 14,
    lineHeight: 20,
  },
  heroPanel: {
    gap: 18,
  },
  heroTop: {
    gap: 16,
  },
  heroCopy: {
    gap: 10,
  },
  heroTitle: {
    color: AppTheme.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroText: {
    color: AppTheme.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryToggle: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: AppTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryToggleMuted: {
    backgroundColor: AppTheme.accentSoft,
  },
  primaryToggleText: {
    color: '#172027',
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    gap: 4,
  },
  statValue: {
    color: AppTheme.text,
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: AppTheme.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  userMeta: {
    gap: 10,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userMetaText: {
    color: AppTheme.text,
    fontSize: 14,
  },
  waitingText: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  vehiclePanel: {
    gap: 12,
  },
  vehicleCurrentLabel: {
    color: AppTheme.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  vehicleCurrentValue: {
    color: AppTheme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  vehicleSelectWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  vehicleSelect: {
    color: AppTheme.text,
    fontSize: 14,
  },
  vehicleEmpty: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  clearVehicleButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearVehicleButtonText: {
    color: AppTheme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  teamPanel: {
    gap: 14,
  },
  panelHeader: {
    gap: 4,
  },
  panelTitle: {
    color: AppTheme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  panelSubtitle: {
    color: AppTheme.mutedText,
    fontSize: 14,
  },
  emptyCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  memberCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    gap: 10,
  },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberIdentity: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#172027',
    fontSize: 18,
    fontWeight: '800',
  },
  memberCopy: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: AppTheme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  memberRole: {
    color: AppTheme.mutedText,
    fontSize: 13,
  },
  memberNote: {
    color: AppTheme.text,
    fontSize: 14,
    lineHeight: 21,
  },
  memberLocationStack: {
    gap: 8,
  },
  memberAddress: {
    color: AppTheme.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  memberMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberMeta: {
    color: AppTheme.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
});








