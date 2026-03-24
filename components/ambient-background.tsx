import { StyleSheet, View } from 'react-native';

export function AmbientBackground() {
  return (
    <>
      <View pointerEvents="none" style={[styles.orb, styles.topGlow]} />
      <View pointerEvents="none" style={[styles.orb, styles.sideGlow]} />
      <View pointerEvents="none" style={[styles.orb, styles.bottomGlow]} />
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.9,
  },
  topGlow: {
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    backgroundColor: 'rgba(247, 165, 49, 0.16)',
  },
  sideGlow: {
    top: 210,
    left: -120,
    width: 260,
    height: 260,
    backgroundColor: 'rgba(110, 208, 255, 0.12)',
  },
  bottomGlow: {
    bottom: -140,
    right: 24,
    width: 320,
    height: 320,
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
  },
});
