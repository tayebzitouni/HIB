import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

export const BUILDING_TYPES = ['House', 'Villa', 'Office'] as const;
export const ARCHITECTURE_STYLES = ['Modern', 'Classic', 'Industrial'] as const;
export const EXTERIOR_MATERIALS = ['Brick', 'Concrete', 'Wood', 'Stone'] as const;
export const ROOF_TYPES = ['Gable', 'Flat'] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];
export type ArchitectureStyle = (typeof ARCHITECTURE_STYLES)[number];
export type ExteriorMaterial = (typeof EXTERIOR_MATERIALS)[number];
export type RoofType = (typeof ROOF_TYPES)[number];
export type AppScreen = 'welcome' | 'form' | 'generating' | 'viewer';
export type SelectedPart = 'walls' | 'roof' | 'windows' | 'door' | null;

export type BuildingConfig = {
  buildingType: BuildingType;
  architectureStyle: ArchitectureStyle;
  exteriorMaterial: ExteriorMaterial;
  roofType: RoofType;
  floors: number;
  width: number;
  depth: number;
  floorHeight: number;
  windowCount: number;
  wallColor: string;
  roofColor: string;
  windowColor: string;
  doorColor: string;
};

type DraftConfig = {
  buildingType: BuildingType;
  architectureStyle: ArchitectureStyle;
  exteriorMaterial: ExteriorMaterial;
  roofType: RoofType;
  floors: string;
  width: string;
  depth: string;
  floorHeight: string;
  windowCount: string;
};

type EditableColors = Pick<BuildingConfig, 'wallColor' | 'roofColor' | 'windowColor' | 'doorColor'>;

type ConfiguratorStore = {
  screen: AppScreen;
  draft: DraftConfig;
  model: BuildingConfig;
  selectedPart: SelectedPart;
  setScreen: (screen: AppScreen) => void;
  setDraftField: <K extends keyof DraftConfig>(key: K, value: DraftConfig[K]) => void;
  generateBuilding: () => void;
  setSelectedPart: (part: SelectedPart) => void;
  updateModelNumber: (
    key: 'floors' | 'width' | 'depth' | 'floorHeight' | 'windowCount',
    amount: number,
  ) => void;
  updatePartColor: (key: keyof EditableColors, color: string) => void;
  startOver: () => void;
};

const initialModel: BuildingConfig = {
  buildingType: 'House',
  architectureStyle: 'Modern',
  exteriorMaterial: 'Brick',
  roofType: 'Gable',
  floors: 2,
  width: 10,
  depth: 8,
  floorHeight: 3,
  windowCount: 3,
  wallColor: '#c9825c',
  roofColor: '#263847',
  windowColor: '#76cce8',
  doorColor: '#70472f',
};

const toDraft = (model: BuildingConfig): DraftConfig => ({
  buildingType: model.buildingType,
  architectureStyle: model.architectureStyle,
  exteriorMaterial: model.exteriorMaterial,
  roofType: model.roofType,
  floors: String(model.floors),
  width: String(model.width),
  depth: String(model.depth),
  floorHeight: String(model.floorHeight),
  windowCount: String(model.windowCount),
});

const clampNumber = (raw: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const materialColor: Record<ExteriorMaterial, string> = {
  Brick: '#c9825c',
  Concrete: '#aeb4b8',
  Wood: '#b47c48',
  Stone: '#a49d91',
};

export const useConfiguratorStore = create<ConfiguratorStore>()(persist((set, get) => ({
  screen: 'welcome',
  draft: toDraft(initialModel),
  model: initialModel,
  selectedPart: null,

  setScreen: (screen) => set({ screen }),

  // Draft keystrokes stay out of the committed 3D model, avoiding expensive
  // geometry updates while the user is still typing.
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),

  generateBuilding: () => {
    const { draft, model } = get();
    const floors = Math.round(clampNumber(draft.floors, model.floors, 1, 3));
    const width = clampNumber(draft.width, model.width, 6, 18);
    const depth = clampNumber(draft.depth, model.depth, 5, 16);
    const floorHeight = clampNumber(draft.floorHeight, model.floorHeight, 2.5, 4.2);
    const windowCount = Math.round(clampNumber(draft.windowCount, model.windowCount, 1, 5));
    const next: BuildingConfig = {
      ...model,
      buildingType: draft.buildingType,
      architectureStyle: draft.architectureStyle,
      exteriorMaterial: draft.exteriorMaterial,
      roofType: draft.roofType,
      floors,
      width,
      depth,
      floorHeight,
      windowCount,
      // Keep the user's saved wall color when regenerating the same material.
      // Only a deliberate exterior-material change selects a new default.
      wallColor:
        draft.exteriorMaterial === model.exteriorMaterial
          ? model.wallColor
          : materialColor[draft.exteriorMaterial],
    };
    // A short generating screen separates the form press from Canvas mounting.
    // Without it, Android can deliver the same touch to the new GL surface,
    // mutating materials while older GPU drivers are still creating context.
    set({ model: next, draft: toDraft(next), selectedPart: null, screen: 'generating' });
  },

  setSelectedPart: (selectedPart) => set({ selectedPart }),

  updateModelNumber: (key, amount) =>
    set((state) => {
      const ranges = {
        floors: [1, 3, 1], width: [6, 18, 0.5], depth: [5, 16, 0.5],
        floorHeight: [2.5, 4.2, 0.1], windowCount: [1, 5, 1],
      } as const;
      const [min, max, step] = ranges[key];
      const value = Math.min(max, Math.max(min, state.model[key] + amount * step));
      const rounded = Number(value.toFixed(1));
      const model = { ...state.model, [key]: rounded };
      return { model, draft: { ...state.draft, [key]: String(rounded) } };
    }),

  updatePartColor: (key, color) =>
    set((state) => ({ model: { ...state.model, [key]: color } })),

  startOver: () => set({ screen: 'form', selectedPart: null }),
}), {
  name: 'form3d-saved-design-v1',
  storage: createJSONStorage(() => AsyncStorage),
  // Keep only user data. Navigation and selection always start in a safe state.
  partialize: (state) => ({
    draft: state.draft,
    model: state.model,
  }),
}));

export const useDraftConfig = () =>
  useConfiguratorStore(
    useShallow((state) => ({
      draft: state.draft,
      setDraftField: state.setDraftField,
      generateBuilding: state.generateBuilding,
    })),
  );

export const useEditorControls = () =>
  useConfiguratorStore(
    useShallow((state) => ({
      model: state.model,
      selectedPart: state.selectedPart,
      setSelectedPart: state.setSelectedPart,
      updateModelNumber: state.updateModelNumber,
      updatePartColor: state.updatePartColor,
      startOver: state.startOver,
    })),
  );
