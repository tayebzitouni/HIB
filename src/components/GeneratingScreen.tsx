import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useConfiguratorStore } from '../store/useConfiguratorStore';

export function GeneratingScreen() {
  const setScreen = useConfiguratorStore((state) => state.setScreen);

  useEffect(() => {
    // Let the Generate gesture fully finish before the native GL view exists.
    // This avoids touch-through/context races seen on older Android GPU drivers.
    const timer = setTimeout(() => setScreen('viewer'), 900);
    return () => clearTimeout(timer);
  }, [setScreen]);

  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <View style={styles.markInner} />
      </View>
      <Text style={styles.kicker}>FORM3D</Text>
      <Text style={styles.title}>Building your model</Text>
      <Text style={styles.subtitle}>Creating the structure and optimizing it for your phone…</Text>
      <View style={styles.track}><View style={styles.fill} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, backgroundColor: '#071019' },
  mark: { width: 76, height: 76, marginBottom: 24, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11372f', borderWidth: 1, borderColor: '#276251' },
  markInner: { width: 30, height: 30, borderWidth: 4, borderColor: '#55dfb9', transform: [{ rotate: '45deg' }] },
  kicker: { color: '#55dfb9', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#f4f8f9', fontSize: 25, fontWeight: '800', marginTop: 8 },
  subtitle: { maxWidth: 320, color: '#829aa7', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  track: { width: 210, height: 4, overflow: 'hidden', marginTop: 28, borderRadius: 3, backgroundColor: '#15303d' },
  fill: { width: '72%', height: 4, borderRadius: 3, backgroundColor: '#55dfb9' },
});
