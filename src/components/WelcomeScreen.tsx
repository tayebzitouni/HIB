import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useConfiguratorStore } from '../store/useConfiguratorStore';

export function WelcomeScreen() {
  const setScreen = useConfiguratorStore((state) => state.setScreen);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.brandRow}>
        <View style={styles.logo}><View style={styles.logoCube} /><View style={styles.logoRoof} /></View>
        <Text style={styles.brand}>FORM3D</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.previewCard}>
          <View style={styles.previewRoof} />
          <View style={styles.previewHouse}>
            <View style={styles.previewWindowRow}>
              <View style={styles.previewWindow} /><View style={styles.previewWindow} />
            </View>
            <View style={styles.previewDoor} />
          </View>
          <View style={styles.previewGround} />
          <View style={styles.orbitLine} /><View style={styles.orbitDot} />
        </View>

        <Text style={styles.eyebrow}>INTERACTIVE ARCHITECTURE</Text>
        <Text style={styles.title}>Design your space.{`\n`}See it in 3D.</Text>
        <Text style={styles.subtitle}>
          Answer a few questions and create an interactive building you can explore and edit.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => setScreen('form')} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
          <Text style={styles.startText}>Start a new design</Text><Text style={styles.arrow}>→</Text>
        </Pressable>
        <Text style={styles.performance}>Optimized for smooth mobile 3D</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, backgroundColor: '#071019', overflow: 'hidden' },
  glowOne: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(62,218,180,0.10)', top: -110, right: -120 },
  glowTwo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(75,139,212,0.09)', bottom: 100, left: -150 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  logo: { width: 30, height: 30, marginRight: 10 },
  logoCube: { position: 'absolute', left: 5, bottom: 2, width: 21, height: 18, borderWidth: 2, borderColor: '#55dfb9', transform: [{ skewY: '-8deg' }] },
  logoRoof: { position: 'absolute', left: 5, top: 2, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#55dfb9', transform: [{ rotate: '45deg' }] },
  brand: { color: '#f5fbfc', fontWeight: '900', fontSize: 16, letterSpacing: 2.4 },
  hero: { flex: 1, justifyContent: 'center' },
  previewCard: { alignSelf: 'center', width: 250, height: 220, marginBottom: 34, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-2deg' }] },
  previewHouse: { width: 150, height: 98, padding: 17, justifyContent: 'space-between', backgroundColor: '#bd7958', borderWidth: 1, borderColor: '#e3a17d', transform: [{ skewY: '3deg' }] },
  previewRoof: { width: 174, height: 55, marginBottom: -10, zIndex: 2, backgroundColor: '#243d4d', borderColor: '#486274', borderWidth: 1, transform: [{ perspective: 300 }, { rotateX: '55deg' }, { rotateZ: '2deg' }] },
  previewWindowRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewWindow: { width: 31, height: 29, backgroundColor: '#77cde3', borderWidth: 3, borderColor: '#d8e5df' },
  previewDoor: { alignSelf: 'center', width: 27, height: 43, backgroundColor: '#593d2d' },
  previewGround: { width: 215, height: 8, marginTop: 13, borderRadius: 50, backgroundColor: '#18313f' },
  orbitLine: { position: 'absolute', width: 240, height: 92, bottom: 22, borderWidth: 1, borderColor: 'rgba(85,223,185,0.45)', borderRadius: 120 },
  orbitDot: { position: 'absolute', width: 7, height: 7, right: 5, bottom: 64, borderRadius: 4, backgroundColor: '#55dfb9' },
  eyebrow: { color: '#55dfb9', fontSize: 11, fontWeight: '900', letterSpacing: 1.7, marginBottom: 12 },
  title: { color: '#f5f8fa', fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: '#91a6b3', fontSize: 15, lineHeight: 23, marginTop: 16, maxWidth: 360 },
  footer: { paddingBottom: 22 },
  startButton: { minHeight: 58, borderRadius: 17, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#55dfb9' },
  startText: { color: '#06251d', fontWeight: '900', fontSize: 16 },
  arrow: { color: '#06251d', fontWeight: '500', fontSize: 25 },
  performance: { color: '#536b78', fontSize: 11, textAlign: 'center', marginTop: 13 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
