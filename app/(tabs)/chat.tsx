import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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
import { formatCompactDate } from '@/utils/formatters';

export default function ChatScreen() {
  const { session, teamMembers, messages, sendMessage, workspaceError } = useWorkspace();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!session) {
    return <Redirect href="/" />;
  }

  const isDriverReadOnly = session.role === 'Driver';

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.header}>
            <Text style={styles.title}>Shift Chat</Text>
            <Text style={styles.subtitle}>
              NOTE: This is a shared workspace, so all chat messages are visible to everyone in the
              room.
            </Text>
          </View>

          {workspaceError ? (
            <Panel style={styles.warningPanel}>
              <Text style={styles.warningText}>{workspaceError}</Text>
            </Panel>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presenceRow}>
            {teamMembers.map((member) => (
              <StatusChip
                key={member.id}
                label={member.id === session.id ? `${member.name.split(' ')[0]} you` : member.name.split(' ')[0]}
                tone={member.status === 'sharing' ? 'positive' : 'muted'}
              />
            ))}
          </ScrollView>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <Panel>
                <Text style={styles.emptyTitle}>No chat messages yet</Text>
                <Text style={styles.emptyCopy}>
                  {isDriverReadOnly
                    ? 'Drivers can review shift updates here once another team member posts the first message.'
                    : 'The first message you send will appear here for everyone in the room.'}
                </Text>
              </Panel>
            ) : null}

            {messages.map((message) => {
              const mine = message.authorId === session.id;
              const system = message.tone === 'system';

              if (system) {
                return (
                  <View key={message.id} style={styles.systemWrap}>
                    <Text style={styles.systemText}>{message.body}</Text>
                  </View>
                );
              }

              return (
                <View
                  key={message.id}
                  style={[styles.messageBubbleWrap, mine ? styles.messageBubbleWrapMine : null]}>
                  <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : null]}>
                    <Text style={styles.messageAuthor}>{mine ? 'You' : message.authorName}</Text>
                    <Text style={[styles.messageBody, mine ? styles.messageBodyMine : null]}>
                      {message.body}
                    </Text>
                    <Text style={[styles.messageTime, mine ? styles.messageTimeMine : null]}>
                      {formatCompactDate(message.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {isDriverReadOnly ? (
            <Panel style={styles.readOnlyPanel}>
              <StatusChip label="Read only" tone="muted" />
              <Text style={styles.readOnlyTitle}>Drivers can review room traffic here.</Text>
              <Text style={styles.readOnlyCopy}>
                Only guides, dispatch, supervisors, and ops leads can post new messages to shift
                chat.
              </Text>
            </Panel>
          ) : (
            <Panel style={styles.composerPanel}>
              <Text style={styles.composerLabel}>Post an update</Text>
              <TextInput
                multiline
                onChangeText={setDraft}
                placeholder="Traffic delay at gate 3. Rerouting to north exit."
                placeholderTextColor={AppTheme.mutedText}
                style={styles.composerInput}
                value={draft}
              />
              <Pressable
                onPress={async () => {
                  const sent = await sendMessage(draft);

                  if (sent) {
                    setDraft('');
                  }
                }}
                style={styles.sendButton}>
                <Text style={styles.sendButtonText}>Send to shift room</Text>
              </Pressable>
            </Panel>
          )}
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
  flex: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    color: AppTheme.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.mutedText,
    fontSize: 15,
    lineHeight: 22,
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
  presenceRow: {
    gap: 10,
    paddingBottom: 2,
  },
  messages: {
    flex: 1,
  },
  messageList: {
    gap: 12,
    paddingVertical: 6,
  },
  emptyTitle: {
    color: AppTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  systemWrap: {
    alignSelf: 'center',
    maxWidth: '88%',
    borderRadius: 999,
    backgroundColor: 'rgba(247, 165, 49, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  systemText: {
    color: AppTheme.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageBubbleWrap: {
    alignItems: 'flex-start',
  },
  messageBubbleWrapMine: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    width: '84%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: AppTheme.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  messageBubbleMine: {
    backgroundColor: 'rgba(247, 165, 49, 0.16)',
    borderColor: 'rgba(247, 165, 49, 0.36)',
  },
  messageAuthor: {
    color: AppTheme.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  messageBody: {
    color: AppTheme.text,
    fontSize: 15,
    lineHeight: 22,
  },
  messageBodyMine: {
    color: '#FFF7EA',
  },
  messageTime: {
    color: AppTheme.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },
  messageTimeMine: {
    color: '#FFE7B6',
  },
  composerPanel: {
    gap: 12,
  },
  composerLabel: {
    color: AppTheme.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  composerInput: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: AppTheme.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 16,
    backgroundColor: AppTheme.accent,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#172027',
    fontSize: 15,
    fontWeight: '800',
  },
  readOnlyPanel: {
    gap: 10,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  readOnlyTitle: {
    color: AppTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  readOnlyCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
});
