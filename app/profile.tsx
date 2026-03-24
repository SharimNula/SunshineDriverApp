import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { Panel } from '@/components/panel';
import { StatusChip } from '@/components/status-chip';
import { AppTheme } from '@/constants/theme';
import { useWorkspace } from '@/providers/workspace-provider';
import { UserRole } from '@/types/relay';

const roles: UserRole[] = ['Driver', 'Guide', 'Dispatcher', 'Supervisor', 'Ops Lead'];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, authBusy, authError, updateProfileInfo, updateCredentials } = useWorkspace();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Driver');
  const [shiftLabel, setShiftLabel] = useState('');
  const [nextEmail, setNextEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(null);
  const [credentialsSavedMessage, setCredentialsSavedMessage] = useState<string | null>(null);
  const [credentialsValidationError, setCredentialsValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    setName(session.name);
    setRole(session.role);
    setShiftLabel(session.shiftLabel);
    setNextEmail(session.email);
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setProfileSavedMessage(null);
    setCredentialsSavedMessage(null);
    setCredentialsValidationError(null);
  }, [session]);

  if (!session) {
    return <Redirect href="/" />;
  }

  const activeSession = session;

  async function handleProfileSave() {
    const success = await updateProfileInfo({
      name,
      role,
      shiftLabel,
    });

    if (success) {
      setProfileSavedMessage('Profile saved. Your live room details have been updated.');
    } else {
      setProfileSavedMessage(null);
    }
  }

  async function handleCredentialSave() {
    setCredentialsValidationError(null);
    setCredentialsSavedMessage(null);

    if (nextPassword && nextPassword !== confirmPassword) {
      setCredentialsValidationError('New password and confirmation password must match.');
      return;
    }

    if (!currentPassword) {
      setCredentialsValidationError('Enter your current password to update email or password.');
      return;
    }

    if (nextEmail.trim().toLowerCase() === activeSession.email.toLowerCase() && !nextPassword.trim()) {
      setCredentialsValidationError('Enter a new email or password before saving account credentials.');
      return;
    }

    const result = await updateCredentials({
      currentPassword,
      nextEmail,
      nextPassword,
    });

    if (!result) {
      return;
    }

    const messages: string[] = [];

    if (result.passwordUpdated) {
      messages.push('Password updated.');
    }

    if (result.emailVerificationSent) {
      messages.push(`Check ${nextEmail.trim().toLowerCase()} to confirm your email change.`);
    }

    setCredentialsSavedMessage(messages.join(' '));
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
  }

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="arrow-back" size={20} color={AppTheme.text} />
            </Pressable>
            <View style={styles.headerCopy}>
              <StatusChip label="Profile" tone="accent" />
              <Text style={styles.title}>Edit your workspace profile</Text>
              <Text style={styles.subtitle}>
                Update the details your team sees across live tracking, chat, and file handoffs.
              </Text>
            </View>
          </View>

          {authError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <Panel style={styles.formPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Room Profile</Text>
              <Text style={styles.sectionSubtitle}>These values appear throughout the shared workspace.</Text>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              placeholder="Alex Rivera"
              placeholderTextColor={AppTheme.mutedText}
              style={styles.input}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setProfileSavedMessage(null);
              }}
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {roles.map((candidate) => {
                const selected = candidate === role;

                return (
                  <Pressable
                    key={candidate}
                    onPress={() => {
                      setRole(candidate);
                      setProfileSavedMessage(null);
                    }}
                    style={[styles.roleChip, selected ? styles.roleChipSelected : null]}>
                    <Text style={[styles.roleChipText, selected ? styles.roleChipTextSelected : null]}>
                      {candidate}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Shift Label</Text>
            <TextInput
              placeholder="Active Shift"
              placeholderTextColor={AppTheme.mutedText}
              style={styles.input}
              value={shiftLabel}
              onChangeText={(value) => {
                setShiftLabel(value);
                setProfileSavedMessage(null);
              }}
              maxLength={40}
            />

            {profileSavedMessage ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{profileSavedMessage}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={authBusy}
              onPress={() => {
                void handleProfileSave();
              }}
              style={[styles.primaryButton, authBusy ? styles.primaryButtonDisabled : null]}>
              <Text style={styles.primaryButtonText}>{authBusy ? 'Saving...' : 'Save profile'}</Text>
            </Pressable>
          </Panel>

          <Panel style={styles.formPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Credentials</Text>
              <Text style={styles.sectionSubtitle}>
                Update your Firebase sign-in email and password. Email changes require verification.
              </Text>
            </View>

            <Text style={styles.label}>Current Email</Text>
            <View style={styles.readonlyCard}>
              <Text style={styles.readonlyValue}>{activeSession.email}</Text>
              <Text style={styles.readonlyHint}>This is your current Firebase sign-in email.</Text>
            </View>

            <Text style={styles.label}>New Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="alex@sunshine.app"
              placeholderTextColor={AppTheme.mutedText}
              style={styles.input}
              value={nextEmail}
              onChangeText={(value) => {
                setNextEmail(value);
                setCredentialsSavedMessage(null);
                setCredentialsValidationError(null);
              }}
            />

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Required to confirm changes"
              placeholderTextColor={AppTheme.mutedText}
              secureTextEntry
              style={styles.input}
              value={currentPassword}
              onChangeText={(value) => {
                setCurrentPassword(value);
                setCredentialsSavedMessage(null);
                setCredentialsValidationError(null);
              }}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Leave blank to keep current password"
              placeholderTextColor={AppTheme.mutedText}
              secureTextEntry
              style={styles.input}
              value={nextPassword}
              onChangeText={(value) => {
                setNextPassword(value);
                setCredentialsSavedMessage(null);
                setCredentialsValidationError(null);
              }}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Repeat the new password"
              placeholderTextColor={AppTheme.mutedText}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setCredentialsSavedMessage(null);
                setCredentialsValidationError(null);
              }}
            />

            {credentialsValidationError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{credentialsValidationError}</Text>
              </View>
            ) : null}

            {credentialsSavedMessage ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{credentialsSavedMessage}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={authBusy}
              onPress={() => {
                void handleCredentialSave();
              }}
              style={[styles.primaryButton, authBusy ? styles.primaryButtonDisabled : null]}>
              <Text style={styles.primaryButtonText}>
                {authBusy ? 'Saving...' : 'Update email and password'}
              </Text>
            </Pressable>
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
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: AppTheme.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  formPanel: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    color: AppTheme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: AppTheme.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: AppTheme.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roleChipSelected: {
    borderColor: AppTheme.accent,
    backgroundColor: 'rgba(247, 165, 49, 0.14)',
  },
  roleChipText: {
    color: AppTheme.mutedText,
    fontSize: 14,
    fontWeight: '700',
  },
  roleChipTextSelected: {
    color: AppTheme.accentSoft,
  },
  readonlyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    gap: 6,
  },
  readonlyValue: {
    color: AppTheme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  readonlyHint: {
    color: AppTheme.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(191, 232, 125, 0.35)',
    backgroundColor: 'rgba(191, 232, 125, 0.12)',
    padding: 12,
  },
  successText: {
    color: '#F0FFD5',
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 106, 106, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 106, 0.3)',
    padding: 12,
  },
  errorText: {
    color: '#FFD1D1',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: AppTheme.accent,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#172027',
    fontSize: 16,
    fontWeight: '800',
  },
});
