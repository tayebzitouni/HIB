import { memo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ARCHITECTURE_STYLES,
  BUILDING_TYPES,
  EXTERIOR_MATERIALS,
  ROOF_TYPES,
  useConfiguratorStore,
  useDraftConfig,
} from '../store/useConfiguratorStore';

type NumberFieldProps = {
  label: string;
  helper: string;
  suffix: string;
  value: string;
  onChangeText: (value: string) => void;
};

const NumberField = memo(function NumberField({ label, helper, suffix, value, onChangeText }: NumberFieldProps) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={onChangeText}
          selectTextOnFocus
          style={styles.input}
          value={value}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
});

function ChoiceGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = selected === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ProjectForm() {
  const { draft, setDraftField, generateBuilding } = useDraftConfig();
  const setScreen = useConfiguratorStore((state) => state.setScreen);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => setScreen('welcome')} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>NEW PROJECT</Text>
            <Text style={styles.title}>Tell us what to build</Text>
          </View>
          <View style={styles.stepBadge}><Text style={styles.stepText}>1 / 2</Text></View>
        </View>

        <View style={styles.progressTrack}><View style={styles.progressFill} /></View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionTitle}>Building concept</Text>
          <ChoiceGroup
            label="What are you designing?"
            options={BUILDING_TYPES}
            selected={draft.buildingType}
            onSelect={(value) => setDraftField('buildingType', value as typeof draft.buildingType)}
          />
          <ChoiceGroup
            label="Architecture style"
            options={ARCHITECTURE_STYLES}
            selected={draft.architectureStyle}
            onSelect={(value) => setDraftField('architectureStyle', value as typeof draft.architectureStyle)}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionNumber}>02</Text>
          <Text style={styles.sectionTitle}>Size and layout</Text>
          <View style={styles.numberGrid}>
            <NumberField label="Floors" helper="1 – 3" suffix="levels" value={draft.floors} onChangeText={(value) => setDraftField('floors', value)} />
            <NumberField label="Front width" helper="6 – 18 m" suffix="m" value={draft.width} onChangeText={(value) => setDraftField('width', value)} />
            <NumberField label="Building depth" helper="5 – 16 m" suffix="m" value={draft.depth} onChangeText={(value) => setDraftField('depth', value)} />
            <NumberField label="Floor height" helper="2.5 – 4.2 m" suffix="m" value={draft.floorHeight} onChangeText={(value) => setDraftField('floorHeight', value)} />
            <NumberField label="Windows / side" helper="1 – 5" suffix="each" value={draft.windowCount} onChangeText={(value) => setDraftField('windowCount', value)} />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionNumber}>03</Text>
          <Text style={styles.sectionTitle}>Exterior finish</Text>
          <ChoiceGroup
            label="Facade material"
            options={EXTERIOR_MATERIALS}
            selected={draft.exteriorMaterial}
            onSelect={(value) => setDraftField('exteriorMaterial', value as typeof draft.exteriorMaterial)}
          />
          <ChoiceGroup
            label="Roof shape"
            options={ROOF_TYPES}
            selected={draft.roofType}
            onSelect={(value) => setDraftField('roofType', value as typeof draft.roofType)}
          />

          <View style={styles.summary}>
            <Text style={styles.summaryIcon}>◇</Text>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Ready to generate</Text>
              <Text style={styles.summaryText}>Your model stays editable after it is created.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={generateBuilding} style={({ pressed }) => [styles.generateButton, pressed && styles.pressed]}>
            <View><Text style={styles.generateText}>Generate 3D building</Text><Text style={styles.generateSubtext}>Creates instantly on your phone</Text></View>
            <Text style={styles.generateArrow}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071019' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#102330', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#213b4a' },
  backText: { color: '#e9f2f5', fontSize: 31, lineHeight: 34, marginTop: -2 },
  headerCopy: { flex: 1, marginLeft: 13 },
  kicker: { color: '#55dfb9', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#f4f8f9', fontSize: 20, fontWeight: '800', marginTop: 3 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: '#123329' },
  stepText: { color: '#6fe1c2', fontSize: 10, fontWeight: '800' },
  progressTrack: { height: 2, backgroundColor: '#102532' },
  progressFill: { width: '50%', height: 2, backgroundColor: '#55dfb9' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  sectionNumber: { color: '#55dfb9', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { color: '#eff5f7', fontSize: 23, fontWeight: '800', marginTop: 4, marginBottom: 19 },
  group: { marginBottom: 19 },
  fieldLabel: { color: '#a9bac4', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 82, flexGrow: 1, alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12, borderRadius: 12, backgroundColor: '#10222e', borderWidth: 1, borderColor: '#263e4d' },
  chipActive: { backgroundColor: '#d9fff4', borderColor: '#d9fff4' },
  chipText: { color: '#a9bbc5', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#08251e' },
  divider: { height: 1, backgroundColor: '#17303d', marginTop: 8, marginBottom: 24 },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  numberField: { width: '47%', flexGrow: 1 },
  inputShell: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#0c1d28', borderWidth: 1, borderColor: '#294250' },
  input: { flex: 1, padding: 0, color: '#fff', fontSize: 17, fontWeight: '700' },
  suffix: { color: '#66808e', fontSize: 10 },
  helper: { color: '#4d6876', fontSize: 9, marginTop: 5 },
  summary: { flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 3, borderRadius: 14, backgroundColor: '#0e2c27', borderWidth: 1, borderColor: '#1c5245' },
  summaryIcon: { color: '#55dfb9', fontSize: 27, marginRight: 13 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: '#dcfff5', fontSize: 13, fontWeight: '800' },
  summaryText: { color: '#72a799', fontSize: 10, marginTop: 3 },
  footer: { paddingHorizontal: 18, paddingTop: 11, paddingBottom: Platform.OS === 'ios' ? 10 : 16, borderTopWidth: 1, borderColor: '#18303d', backgroundColor: '#08141d' },
  generateButton: { minHeight: 60, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#55dfb9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  generateText: { color: '#06251d', fontSize: 15, fontWeight: '900' },
  generateSubtext: { color: '#277a64', fontSize: 9, marginTop: 2 },
  generateArrow: { color: '#06251d', fontSize: 26 },
  pressed: { opacity: 0.75 },
});
