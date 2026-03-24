import * as DocumentPicker from 'expo-document-picker';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { Panel } from '@/components/panel';
import { StatusChip } from '@/components/status-chip';
import { AppTheme } from '@/constants/theme';
import { useWorkspace } from '@/providers/workspace-provider';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

export default function FilesScreen() {
  const { session, sharedFiles, shareFile, workspaceError } = useWorkspace();
  const [note, setNote] = useState('');
  const [isPicking, setIsPicking] = useState(false);

  if (!session) {
    return <Redirect href="/" />;
  }

  const isDriverReadOnly = session.role === 'Driver';

  async function handleShareFile() {
    setIsPicking(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const uploaded = await shareFile({
        name: asset.name,
        size: asset.size ?? null,
        mimeType: asset.mimeType ?? null,
        uri: asset.uri,
        note,
      });

      if (uploaded) {
        setNote('');
      }
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Driver & Guide Documents</Text>
            <Text style={styles.subtitle}>
              NOTE: All files uploaded here are visible to everyone in the room, please only upload
              relevant documents and avoid sharing sensitive information.
            </Text>
          </View>

          {workspaceError ? (
            <Panel style={styles.warningPanel}>
              <Text style={styles.warningText}>{workspaceError}</Text>
            </Panel>
          ) : null}

          {isDriverReadOnly ? (
            <Panel style={styles.readOnlyPanel}>
              <View style={styles.shareHeader}>
                <StatusChip label="Read only" tone="muted" />
                <Text style={styles.shareTitle}>Drivers can review shared documents here.</Text>
              </View>
              <Text style={styles.readOnlyCopy}>
                Only guides, dispatch, supervisors, and ops leads can upload new files to the shared
                library.
              </Text>
            </Panel>
          ) : (
            <Panel style={styles.sharePanel}>
              <View style={styles.shareHeader}>
                <StatusChip label="Cloud upload" tone="positive" />
                <Text style={styles.shareTitle}>Add context before you send the file.</Text>
              </View>

              <TextInput
                multiline
                onChangeText={setNote}
                placeholder="Leave a quick note for the team..."
                placeholderTextColor={AppTheme.mutedText}
                style={styles.noteInput}
                value={note}
              />

              <Pressable
                onPress={handleShareFile}
                style={[styles.shareButton, isPicking ? styles.shareButtonBusy : null]}>
                <Text style={styles.shareButtonText}>
                  {isPicking ? 'Opening picker...' : 'Choose file to upload'}
                </Text>
              </Pressable>
            </Panel>
          )}

          <Panel style={styles.libraryPanel}>
            <View style={styles.libraryHeader}>
              <Text style={styles.libraryTitle}>Shared Library</Text>
              <Text style={styles.librarySubtitle}>{sharedFiles.length} files in shared workspace</Text>
            </View>

            {sharedFiles.length === 0 ? (
              <Text style={styles.emptyCopy}>No files have been uploaded to this workspace yet.</Text>
            ) : null}

            {sharedFiles.map((file) => (
              <View key={file.id} style={styles.fileCard}>
                <View style={styles.fileTop}>
                  <View style={styles.fileCopy}>
                    <Text style={styles.fileName}>{file.name}</Text>
                    <Text style={styles.fileMeta}>
                      {file.sharedBy} | {formatRelativeTime(file.sharedAt)}
                    </Text>
                  </View>
                  <StatusChip label={file.mimeType?.split('/')[1] ?? 'file'} tone="muted" />
                </View>

                <Text style={styles.fileNote}>{file.note || 'No note attached.'}</Text>

                <View style={styles.fileFooter}>
                  <Text style={styles.fileFooterText}>{formatFileSize(file.size)}</Text>
                  <Text style={styles.fileFooterText}>Stored in Workspace Storage</Text>
                </View>

                {file.uri ? (
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(file.uri);
                    }}
                    style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>Open file</Text>
                  </Pressable>
                ) : null}
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
  sharePanel: {
    gap: 14,
  },
  shareHeader: {
    gap: 10,
  },
  shareTitle: {
    color: AppTheme.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  noteInput: {
    minHeight: 96,
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
  shareButton: {
    borderRadius: 16,
    backgroundColor: AppTheme.accent,
    paddingVertical: 15,
    alignItems: 'center',
  },
  shareButtonBusy: {
    opacity: 0.75,
  },
  shareButtonText: {
    color: '#172027',
    fontSize: 15,
    fontWeight: '800',
  },
  readOnlyPanel: {
    gap: 12,
    borderColor: 'rgba(116, 166, 181, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  readOnlyCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  libraryPanel: {
    gap: 14,
  },
  libraryHeader: {
    gap: 4,
  },
  libraryTitle: {
    color: AppTheme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  librarySubtitle: {
    color: AppTheme.mutedText,
    fontSize: 14,
  },
  emptyCopy: {
    color: AppTheme.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  fileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 14,
    gap: 10,
  },
  fileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  fileCopy: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    color: AppTheme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  fileMeta: {
    color: AppTheme.mutedText,
    fontSize: 13,
  },
  fileNote: {
    color: AppTheme.text,
    fontSize: 14,
    lineHeight: 21,
  },
  fileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  fileFooterText: {
    color: AppTheme.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  linkButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.outline,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkButtonText: {
    color: AppTheme.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
