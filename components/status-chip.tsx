import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type StatusChipProps = {
  label: string;
  tone?: 'accent' | 'positive' | 'warning' | 'muted' | 'danger';
};

const toneStyles = {
  accent: {
    backgroundColor: 'rgba(247, 165, 49, 0.16)',
    borderColor: 'rgba(247, 165, 49, 0.42)',
    color: AppTheme.accentSoft,
  },
  positive: {
    backgroundColor: 'rgba(191, 232, 125, 0.15)',
    borderColor: 'rgba(191, 232, 125, 0.36)',
    color: AppTheme.success,
  },
  warning: {
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    borderColor: 'rgba(255, 122, 89, 0.34)',
    color: AppTheme.secondary,
  },
  muted: {
    backgroundColor: 'rgba(150, 175, 183, 0.12)',
    borderColor: 'rgba(150, 175, 183, 0.22)',
    color: AppTheme.mutedText,
  },
  danger: {
    backgroundColor: 'rgba(255, 92, 92, 0.14)',
    borderColor: 'rgba(255, 92, 92, 0.34)',
    color: AppTheme.danger,
  },
};

export function StatusChip({ label, tone = 'accent' }: StatusChipProps) {
  const selectedTone = toneStyles[tone];

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selectedTone.backgroundColor,
          borderColor: selectedTone.borderColor,
        },
      ]}>
      <Text style={[styles.label, { color: selectedTone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
