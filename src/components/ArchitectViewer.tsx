import { Canvas, useThree } from '@react-three/fiber/native';
import { memo, useEffect, useRef } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MathUtils, Spherical, Vector3 } from 'three';

import { useConfiguratorStore, useEditorControls, type SelectedPart } from '../store/useConfiguratorStore';
import { ProceduralBuilding } from './ProceduralBuilding';

const COLOR_OPTIONS: Record<Exclude<SelectedPart, null>, string[]> = {
  walls: ['#c9825c', '#aeb4b8', '#b47c48', '#e7dfcc', '#77868d'],
  roof: ['#263847', '#65423b', '#202326', '#8a694f', '#60747b'],
  windows: ['#76cce8', '#9de3db', '#496c8a', '#d9b66f', '#aabcc7'],
  door: ['#70472f', '#273d45', '#a76538', '#e2ded1', '#29302f'],
};

type NativeTouch = {
  identifier?: number;
  locationX?: number;
  locationY?: number;
  pageX?: number;
  pageY?: number;
};

type NativePointerEvent = Event & NativeTouch & {
  touches?: NativeTouch[];
};

type GestureSnapshot = {
  count: number;
  centerX: number;
  centerY: number;
  distance: number;
};

const getTouchCoordinate = (touch: NativeTouch, axis: 'X' | 'Y') =>
  touch[`location${axis}`] ?? touch[`page${axis}`] ?? 0;

function getGestureSnapshot(event: NativePointerEvent): GestureSnapshot | null {
  const touches = event.touches?.length ? event.touches : [event];
  if (touches.length === 0) return null;

  const first = touches[0];
  if (!first) return null;
  const firstX = getTouchCoordinate(first, 'X');
  const firstY = getTouchCoordinate(first, 'Y');
  if (touches.length === 1) {
    return { count: 1, centerX: firstX, centerY: firstY, distance: 0 };
  }

  const second = touches[1];
  if (!second) return null;
  const secondX = getTouchCoordinate(second, 'X');
  const secondY = getTouchCoordinate(second, 'Y');
  return {
    count: 2,
    centerX: (firstX + secondX) / 2,
    centerY: (firstY + secondY) / 2,
    distance: Math.hypot(secondX - firstX, secondY - firstY),
  };
}

/**
 * OrbitControls expects browser pointer events, but React Native's PanResponder
 * emits only one synthetic pointer while a phone can have two real touches.
 * Reading nativeEvent.touches here prevents the one-to-two finger transition
 * from being misread as a giant zoom. It also avoids an animation loop: the
 * camera and GPU redraw only while a finger actually moves.
 */
function NativeCameraControls({
  width,
  depth,
  height,
  clickBlockRef,
}: {
  width: number;
  depth: number;
  height: number;
  clickBlockRef: { current: number };
}) {
  const { camera, gl, invalidate, size } = useThree();

  useEffect(() => {
    const verticalFov = (42 * Math.PI) / 180;
    const aspect = Math.max(0.3, size.width / Math.max(1, size.height));
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const visibleFootprintWidth = width * 0.75 + depth * 0.66;
    const visibleBuildingHeight = height + 2.2;
    const horizontalDistance = visibleFootprintWidth / (2 * Math.tan(horizontalFov / 2) * 0.72);
    const verticalDistance = visibleBuildingHeight / (2 * Math.tan(verticalFov / 2) * 0.68);
    const fitDistance = Math.max(horizontalDistance, verticalDistance);
    const minDistance = fitDistance * 0.58;
    const maxDistance = fitDistance * 2.6;
    const maxTargetOffset = Math.max(width, depth, height) * 0.72;
    const sceneRadius = Math.hypot(width / 2 + 1.5, height / 2 + 2.6, depth / 2 + 1.5);
    const homeTarget = new Vector3(0, height / 2 + 0.65, 0);
    const target = homeTarget.clone();
    const spherical = new Spherical().setFromVector3(
      new Vector3(0.72, 0.46, 0.82).normalize().multiplyScalar(fitDistance),
    );
    const screenRight = new Vector3();
    const screenUp = new Vector3();
    const targetOffset = new Vector3();
    let previousGesture: GestureSnapshot | null = null;
    let gestureStartX = 0;
    let gestureStartY = 0;
    let maxGestureTravel = 0;
    let hadMultiTouch = false;

    const applyCamera = () => {
      camera.position.setFromSpherical(spherical).add(target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      invalidate();
    };

    const rememberGesture = (event: Event) => {
      previousGesture = getGestureSnapshot(event as NativePointerEvent);
      gestureStartX = previousGesture?.centerX ?? 0;
      gestureStartY = previousGesture?.centerY ?? 0;
      maxGestureTravel = 0;
      hadMultiTouch = (previousGesture?.count ?? 0) > 1;
    };

    const moveCamera = (event: Event) => {
      const current = getGestureSnapshot(event as NativePointerEvent);
      const previous = previousGesture;
      previousGesture = current;
      if (current) {
        hadMultiTouch ||= current.count > 1;
        maxGestureTravel = Math.max(
          maxGestureTravel,
          Math.hypot(current.centerX - gestureStartX, current.centerY - gestureStartY),
        );
      }

      // A finger being added or removed starts a new gesture baseline. This is
      // the key guard against the sudden zoom shown in the supplied video.
      if (!current || !previous || current.count !== previous.count) return;

      if (current.count === 1) {
        const dx = current.centerX - previous.centerX;
        const dy = current.centerY - previous.centerY;
        spherical.theta -= (dx / Math.max(1, size.width)) * Math.PI * 1.7;
        spherical.phi = MathUtils.clamp(
          spherical.phi - (dy / Math.max(1, size.height)) * Math.PI * 1.55,
          0.24,
          Math.PI / 2.04,
        );
      } else {
        if (previous.distance > 4 && current.distance > 4) {
          // Limit the change from any one Android motion event. A dropped frame
          // can no longer throw the camera through the building.
          const zoomStep = MathUtils.clamp(previous.distance / current.distance, 0.9, 1.1);
          spherical.radius = MathUtils.clamp(
            spherical.radius * zoomStep,
            minDistance,
            maxDistance,
          );
        }

        const dx = current.centerX - previous.centerX;
        const dy = current.centerY - previous.centerY;
        const worldUnitsPerPixel =
          (2 * spherical.radius * Math.tan(verticalFov / 2)) / Math.max(1, size.height);
        screenRight.setFromMatrixColumn(camera.matrixWorld, 0);
        screenUp.setFromMatrixColumn(camera.matrixWorld, 1);
        target
          .addScaledVector(screenRight, -dx * worldUnitsPerPixel)
          .addScaledVector(screenUp, dy * worldUnitsPerPixel);

        // Panning stays close enough that the model cannot be permanently lost.
        targetOffset.copy(target).sub(homeTarget);
        if (targetOffset.length() > maxTargetOffset) {
          target.copy(homeTarget).add(targetOffset.setLength(maxTargetOffset));
        }
      }

      applyCamera();
    };

    const endGesture = (event: Event) => {
      const remaining = getGestureSnapshot(event as NativePointerEvent);
      previousGesture = (event as NativePointerEvent).touches?.length ? remaining : null;
      if (!(event as NativePointerEvent).touches?.length) {
        if (hadMultiTouch || maxGestureTravel > 8) {
          // R3F Native can synthesize a click after a drag or pinch. Suppress
          // that click so camera gestures never change the selected part.
          clickBlockRef.current = Date.now() + 400;
        }
        invalidate();
      }
    };

    // The old fixed far=60 plane intersected this portrait camera at its home
    // distance and sliced facade triangles during zoom/rotation. Size the
    // clipping range for the maximum allowed zoom, pan, and building radius.
    camera.near = 0.5;
    camera.far = Math.max(120, maxDistance + maxTargetOffset + sceneRadius + 20);
    camera.updateProjectionMatrix();
    spherical.radius = fitDistance;
    applyCamera();

    const element = gl.domElement;
    element.addEventListener('pointerdown', rememberGesture);
    element.addEventListener('pointermove', moveCamera);
    element.addEventListener('pointerup', endGesture);
    element.addEventListener('pointercancel', endGesture);
    element.addEventListener('lostpointercapture', endGesture);
    element.addEventListener('pointerleave', endGesture);

    return () => {
      element.removeEventListener('pointerdown', rememberGesture);
      element.removeEventListener('pointermove', moveCamera);
      element.removeEventListener('pointerup', endGesture);
      element.removeEventListener('pointercancel', endGesture);
      element.removeEventListener('lostpointercapture', endGesture);
      element.removeEventListener('pointerleave', endGesture);
    };
  }, [camera, clickBlockRef, depth, gl, height, invalidate, size.height, size.width, width]);

  return null;
}

function Scene() {
  // Only committed values enter the renderer. The form's draft state never
  // causes the Canvas or its GPU resources to remount.
  const config = useConfiguratorStore((state) => state.model);
  const selectedPart = useConfiguratorStore((state) => state.selectedPart);
  const setSelectedPart = useConfiguratorStore((state) => state.setSelectedPart);
  const totalHeight = config.floors * config.floorHeight;
  const extent = Math.max(config.width, config.depth, totalHeight);
  const clickBlockRef = useRef(0);

  return (
    <>
      <color args={['#071019']} attach="background" />
      <ambientLight color="#d9ecf2" intensity={1.35} />
      <directionalLight color="#fff3dc" intensity={2.5} position={[7, 11, 8]} />

      <NativeCameraControls clickBlockRef={clickBlockRef} depth={config.depth} height={totalHeight} width={config.width} />
      <ProceduralBuilding clickBlockRef={clickBlockRef} config={config} onSelect={setSelectedPart} selectedPart={selectedPart} />

      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[extent * 1.45, 20]} />
        <meshLambertMaterial color="#112833" />
      </mesh>

    </>
  );
}

function ValueControl({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.valueControl}>
      <Text style={styles.valueLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={onMinus} style={styles.stepButton}><Text style={styles.stepButtonText}>−</Text></Pressable>
        <Text style={styles.valueText}>{value}</Text>
        <Pressable onPress={onPlus} style={styles.stepButton}><Text style={styles.stepButtonText}>+</Text></Pressable>
      </View>
    </View>
  );
}

function EditorPanel() {
  const { model, selectedPart, setSelectedPart, updateModelNumber, updatePartColor } = useEditorControls();

  if (!selectedPart) {
    return (
      <View style={[styles.editor, styles.editorCompact]}>
        <View style={styles.handle} />
        <Text style={styles.editorKicker}>TOUCH CONTROLS</Text>
        <Text style={styles.editorTitle}>Double-tap a part to edit it</Text>
        <Text style={styles.compactHelp}>1 finger: rotate   ·   2 fingers: zoom and move</Text>
      </View>
    );
  }

  const colorKey = selectedPart === 'walls' ? 'wallColor' : selectedPart === 'roof' ? 'roofColor' : selectedPart === 'windows' ? 'windowColor' : 'doorColor';
  const activeColor = model[colorKey];

  return (
    <View style={styles.editor}>
      <View style={styles.handle} />
      <View style={styles.editorTitleRow}>
        <View>
          <Text style={styles.editorKicker}>EDITING SELECTION</Text>
          <Text style={styles.editorTitle}>{`${selectedPart.charAt(0).toUpperCase()}${selectedPart.slice(1)}`}</Text>
        </View>
        <Pressable accessibilityLabel="Close editor" onPress={() => setSelectedPart(null)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>

      <Text style={styles.switchHint}>Double-tap another building part to switch</Text>
      <View style={styles.editContent}>
          <View style={styles.colorArea}>
            <Text style={styles.controlLabel}>COLOR</Text>
            <View style={styles.colors}>
              {COLOR_OPTIONS[selectedPart].map((color) => (
                <Pressable
                  key={color}
                  onPress={() => updatePartColor(colorKey, color)}
                  style={[styles.colorOuter, activeColor === color && styles.colorOuterActive]}
                >
                  <View style={[styles.colorDot, { backgroundColor: color }]} />
                </Pressable>
              ))}
            </View>
          </View>

          <ScrollView horizontal contentContainerStyle={styles.values} showsHorizontalScrollIndicator={false}>
            {selectedPart === 'walls' && (
              <>
                <ValueControl label="WIDTH" value={`${model.width} m`} onMinus={() => updateModelNumber('width', -1)} onPlus={() => updateModelNumber('width', 1)} />
                <ValueControl label="DEPTH" value={`${model.depth} m`} onMinus={() => updateModelNumber('depth', -1)} onPlus={() => updateModelNumber('depth', 1)} />
                <ValueControl label="FLOORS" value={String(model.floors)} onMinus={() => updateModelNumber('floors', -1)} onPlus={() => updateModelNumber('floors', 1)} />
              </>
            )}
            {selectedPart === 'windows' && (
              <ValueControl label="PER SIDE" value={String(model.windowCount)} onMinus={() => updateModelNumber('windowCount', -1)} onPlus={() => updateModelNumber('windowCount', 1)} />
            )}
            {selectedPart === 'roof' && (
              <ValueControl label="WALL HEIGHT" value={`${model.floorHeight} m`} onMinus={() => updateModelNumber('floorHeight', -1)} onPlus={() => updateModelNumber('floorHeight', 1)} />
            )}
          </ScrollView>
      </View>
    </View>
  );
}

export const ArchitectViewer = memo(function ArchitectViewer() {
  const { model, startOver } = useEditorControls();

  return (
    <View style={styles.root}>
      <Canvas
        camera={{ fov: 42, near: 0.5, far: 400, position: [12, 9, 14] }}
        frameloop="demand"
        gl={{
          antialias: false,
          alpha: false,
          depth: true,
          stencil: false,
          // `lowp` vertex precision quantizes nearby facade surfaces on some
          // Android GPUs, producing the triangular window/door clipping seen
          // on 4 GB phones. `mediump` keeps geometry stable at negligible cost.
          precision: 'mediump',
          powerPreference: 'low-power',
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          // Expo GL renders at the native surface ratio. Changing DPR after
          // context creation makes Three.js draw into only one corner on
          // high-density phones, so the native Canvas ratio must stay intact.
          // MSAA, shadows and stencil remain disabled for low-memory devices.
          gl.shadowMap.enabled = false;
        }}
      >
        <Scene />
      </Canvas>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.viewerHeader}>
          <Pressable onPress={startOver} style={styles.headerButton}><Text style={styles.headerButtonText}>‹</Text></Pressable>
          <View style={styles.projectTitle}>
            <Text style={styles.projectKicker}>YOUR GENERATED DESIGN</Text>
            <Text numberOfLines={1} style={styles.projectName}>{model.architectureStyle} {model.buildingType}</Text>
          </View>
          <View style={styles.headerPill}><Text style={styles.headerPillText}>{model.floors}F</Text></View>
        </View>
        <View pointerEvents="none" style={styles.gestureHint}>
          <Text style={styles.gestureText}>1 finger rotate  ·  2 fingers zoom/move  ·  Double-tap edit</Text>
        </View>
        <View style={styles.editorWrap}><EditorPanel /></View>
      </SafeAreaView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071019' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
  },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 8, padding: 8, borderRadius: 17, backgroundColor: 'rgba(8,21,30,0.91)', borderWidth: 1, borderColor: '#203948' },
  headerButton: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#142a36', alignItems: 'center', justifyContent: 'center' },
  headerButtonText: { color: '#eaf2f5', fontSize: 29, lineHeight: 31 },
  projectTitle: { flex: 1, marginLeft: 11 },
  projectKicker: { color: '#55dfb9', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  projectName: { color: '#f1f6f8', fontSize: 15, fontWeight: '800', marginTop: 2 },
  headerPill: { minWidth: 38, paddingVertical: 8, alignItems: 'center', borderRadius: 12, backgroundColor: '#123b32' },
  headerPillText: { color: '#75e8c8', fontWeight: '900', fontSize: 10 },
  gestureHint: { position: 'absolute', top: 86, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(6,18,26,0.72)' },
  gestureText: { color: '#829aa7', fontSize: 9, fontWeight: '600' },
  editorWrap: { justifyContent: 'flex-end' },
  editor: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 10, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: 'rgba(9,23,33,0.98)', borderWidth: 1, borderColor: '#263e4d' },
  editorCompact: { paddingBottom: 18 },
  handle: { alignSelf: 'center', width: 39, height: 4, borderRadius: 3, backgroundColor: '#3d5665', marginBottom: 10 },
  editorTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editorKicker: { color: '#55dfb9', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  editorTitle: { color: '#f2f7f8', fontSize: 18, fontWeight: '800', marginTop: 2 },
  compactHelp: { color: '#718995', fontSize: 10, marginTop: 7 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#17303d', borderWidth: 1, borderColor: '#31505f' },
  closeButtonText: { color: '#d8e7eb', fontSize: 11, fontWeight: '900' },
  switchHint: { color: '#718995', fontSize: 9, marginTop: 8 },
  editContent: { marginTop: 10, borderTopWidth: 1, borderColor: '#1d3542', paddingTop: 10 },
  colorArea: { flexDirection: 'row', alignItems: 'center' },
  controlLabel: { width: 57, color: '#718995', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  colors: { flexDirection: 'row', gap: 9 },
  colorOuter: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorOuterActive: { borderColor: '#55dfb9' },
  colorDot: { width: 21, height: 21, borderRadius: 11 },
  values: { gap: 9, paddingTop: 10 },
  valueControl: { width: 132 },
  valueLabel: { color: '#718995', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  stepper: { height: 34, flexDirection: 'row', alignItems: 'center', borderRadius: 9, backgroundColor: '#0c1d28', borderWidth: 1, borderColor: '#294250' },
  stepButton: { width: 35, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepButtonText: { color: '#55dfb9', fontSize: 19 },
  valueText: { flex: 1, textAlign: 'center', color: '#f3f7f9', fontSize: 11, fontWeight: '800' },
});
