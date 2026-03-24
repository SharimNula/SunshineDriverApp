import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { Panel } from '@/components/panel';
import { StatusChip } from '@/components/status-chip';
import { AppTheme } from '@/constants/theme';
import { useWorkspace } from '@/providers/workspace-provider';
import { UserRole } from '@/types/relay';

const roles: UserRole[] = ['Driver', 'Guide', 'Dispatcher', 'Supervisor', 'Ops Lead'];

type AuthMode = 'sign-in' | 'register';

export default function SignInScreen() {
  const {
    session,
    authReady,
    authBusy,
    authError,
    firebaseConfigured,
    firebaseMissingKeys,
    register,
    signIn,
  } = useWorkspace();
  const [mode, setMode] = useState<AuthMode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Driver');

  if (session) {
    return <Redirect href="/live" />;
  }

  if (!authReady) {
    return (
      <View style={styles.screen}>
        <AmbientBackground />
        <SafeAreaView style={styles.centeredSafeArea}>
          <Panel style={styles.loadingPanel}>
            <ActivityIndicator color={AppTheme.accent} />
            <Text style={styles.loadingTitle}>Connecting to Firebase</Text>
            <Text style={styles.loadingCopy}>Restoring your workspace session and subscriptions.</Text>
          </Panel>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <StatusChip label="Firebase Workspace" tone="accent" />
            <Text style={styles.eyebrow}>Sunshine Tours Operations Relay</Text>
            <Text style={styles.title}>Live Operations Room</Text>

            <Panel style={styles.formPanel}>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode('sign-in')}
                  style={[styles.modeChip, mode === 'sign-in' ? styles.modeChipSelected : null]}>
                  <Text style={[styles.modeChipText, mode === 'sign-in' ? styles.modeChipTextSelected : null]}>
                    Sign in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('register')}
                  style={[styles.modeChip, mode === 'register' ? styles.modeChipSelected : null]}>
                  <Text style={[styles.modeChipText, mode === 'register' ? styles.modeChipTextSelected : null]}>
                    Create account
                  </Text>
                </Pressable>
              </View>

              {!firebaseConfigured ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Firebase config required</Text>
                  <Text style={styles.warningCopy}>
                    Add these values to `.env.local` before signing in:
                  </Text>
                  {firebaseMissingKeys.map((key) => (
                    <Text key={key} style={styles.warningKey}>
                      {key}
                    </Text>
                  ))}
                </View>
              ) : null}

              {mode === 'register' ? (
                <>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    placeholder="Alex Rivera"
                    placeholderTextColor={AppTheme.mutedText}
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.label}>Role</Text>
                  <View style={styles.roleRow}>
                    {roles.map((candidate) => {
                      const selected = candidate === role;

                      return (
                        <Pressable
                          key={candidate}
                          onPress={() => setRole(candidate)}
                          style={[styles.roleChip, selected ? styles.roleChipSelected : null]}>
                          <Text style={[styles.roleChipText, selected ? styles.roleChipTextSelected : null]}>
                            {candidate}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="alex@sunshine.app"
                placeholderTextColor={AppTheme.mutedText}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                placeholder="At least 6 characters"
                placeholderTextColor={AppTheme.mutedText}
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />

              {authError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              ) : null}

              <Pressable
                disabled={!firebaseConfigured || authBusy}
                onPress={() => {
                  if (mode === 'register') {
                    void register({ name, email, password, role });
                    return;
                  }

                  void signIn({ email, password });
                }}
                style={[styles.primaryButton, !firebaseConfigured || authBusy ? styles.primaryButtonDisabled : null]}>
                <Text style={styles.primaryButtonText}>
                  {authBusy ? 'Working...' : mode === 'register' ? 'Create Firebase account' : 'Sign in to workspace'}
                </Text>
              </Pressable>
            </Panel>
          </ScrollView>
        </KeyboardAvoidingView>
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
  centeredSafeArea: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 18,
  },
  eyebrow: {
    color: AppTheme.accentSoft,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  featurePanel: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    color: AppTheme.text,
    fontSize: 15,
    lineHeight: 22,
  },
  formPanel: {
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  modeChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeChipSelected: {
    borderColor: AppTheme.accent,
    backgroundColor: 'rgba(247, 165, 49, 0.14)',
  },
  modeChipText: {
    color: AppTheme.mutedText,
    fontSize: 14,
    fontWeight: '700',
  },
  modeChipTextSelected: {
    color: AppTheme.accentSoft,
  },
  warningCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.35)',
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
    padding: 14,
    gap: 8,
  },
  warningTitle: {
    color: '#FFD4C8',
    fontSize: 16,
    fontWeight: '700',
  },
  warningCopy: {
    color: '#FFDCCF',
    fontSize: 14,
    lineHeight: 20,
  },
  warningKey: {
    color: '#FFF1EC',
    fontSize: 12,
    fontWeight: '700',
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
  loadingPanel: {
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    color: AppTheme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  loadingCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
