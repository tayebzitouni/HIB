import { useThree, type ThreeEvent } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  BoxGeometry,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { BuildingConfig, SelectedPart } from '../store/useConfiguratorStore';

type SelectablePart = Exclude<SelectedPart, null>;

type Transform = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
};

type FaceRange = {
  end: number;
  colorPart: SelectablePart | null;
  selectPart: SelectablePart | null;
  start: number;
};

type GeometryShape = 'box' | 'plane';

function createTransformedGeometry(transform: Transform, shape: GeometryShape) {
  const position = new Vector3(...transform.position);
  const rotation = new Euler(...(transform.rotation ?? [0, 0, 0]));
  const quaternion = new Quaternion().setFromEuler(rotation);
  const scale = new Vector3(...transform.scale);
  const matrix = new Matrix4().compose(position, quaternion, scale);
  const source = shape === 'plane'
    ? new PlaneGeometry(1, 1)
    : new BoxGeometry(1, 1, 1);

  source.applyMatrix4(matrix);
  const geometry = source.toNonIndexed();
  source.dispose();
  return geometry;
}

function colorGeometry(geometry: BufferGeometry, colorValue: string) {
  const color = new Color(colorValue);

  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const offset = index * 3;
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

function createWindows(config: BuildingConfig) {
  const { width, depth, floors, floorHeight, windowCount } = config;
  const totalHeight = floors * floorHeight;
  const windowHeight = Math.min(1.45, floorHeight * 0.48);
  const frontWindowWidth = Math.min(1.3, (width - 2) / Math.max(3, windowCount));
  const sideCount = Math.max(1, windowCount - 1);
  const sideWindowWidth = Math.min(1.25, (depth - 1.8) / Math.max(2, sideCount));
  const transforms: Transform[] = [];

  for (let floor = 0; floor < floors; floor += 1) {
    const y = -totalHeight / 2 + floorHeight * floor + floorHeight * 0.58;
    for (let index = 0; index < windowCount; index += 1) {
      const x = -width / 2 + ((index + 1) * width) / (windowCount + 1);
      if (!(floor === 0 && Math.abs(x) < (width / (windowCount + 1)) * 0.55)) {
        transforms.push(
          { position: [x, y, depth / 2 + 0.38], scale: [frontWindowWidth, windowHeight, 1] },
          { position: [-x, y, -depth / 2 - 0.38], scale: [frontWindowWidth, windowHeight, 1], rotation: [0, Math.PI, 0] },
        );
      }
    }
    for (let index = 0; index < sideCount; index += 1) {
      const z = -depth / 2 + ((index + 1) * depth) / (sideCount + 1);
      transforms.push(
        { position: [width / 2 + 0.38, y, z], scale: [sideWindowWidth, windowHeight, 1], rotation: [0, Math.PI / 2, 0] },
        { position: [-width / 2 - 0.38, y, -z], scale: [sideWindowWidth, windowHeight, 1], rotation: [0, -Math.PI / 2, 0] },
      );
    }
  }
  return transforms;
}

function buildBuildingGeometry(config: BuildingConfig) {
  const { width, depth, floors, floorHeight, roofType, architectureStyle, buildingType } = config;
  const totalHeight = floors * floorHeight;
  const geometries: BufferGeometry[] = [];
  const ranges: FaceRange[] = [];
  let vertexCursor = 0;

  const addCategory = (
    transforms: Transform[],
    color: string,
    selectPart: SelectablePart | null,
    shape: GeometryShape = 'box',
    colorPart: SelectablePart | null = selectPart,
  ) => {
    const start = vertexCursor;
    transforms.forEach((transform) => {
      const geometry = createTransformedGeometry(transform, shape);
      colorGeometry(geometry, color);
      vertexCursor += geometry.getAttribute('position').count;
      geometries.push(geometry);
    });
    if ((selectPart || colorPart) && vertexCursor > start) {
      ranges.push({ start, end: vertexCursor, selectPart, colorPart });
    }
  };

  addCategory(
    [{ position: [0, 0, 0], scale: [width, totalHeight, depth] }],
    config.wallColor,
    'walls',
  );

  const floorBands: Transform[] = [];
  for (let floor = 1; floor < floors; floor += 1) {
    floorBands.push({
      position: [0, -totalHeight / 2 + floor * floorHeight, 0],
      scale: [width + 0.62, 0.14, depth + 0.62],
    });
  }
  addCategory(floorBands, '#d7dedc', 'walls', 'box', null);

  const roofs: Transform[] = [];
  if (roofType === 'Flat') {
    roofs.push(
      { position: [0, totalHeight / 2 + 0.18, 0], scale: [width + 0.6, 0.36, depth + 0.6] },
      { position: [0, totalHeight / 2 + 0.52, 0], scale: [width - 0.7, 0.34, depth - 0.7] },
    );
  } else {
    const angle = Math.atan2(2.15, depth / 2);
    const panelDepth = Math.sqrt((depth / 2 + 0.45) ** 2 + 2.15 ** 2);
    roofs.push(
      { position: [0, totalHeight / 2 + 1.04, depth / 4], scale: [width + 0.65, 0.22, panelDepth], rotation: [angle, 0, 0] },
      { position: [0, totalHeight / 2 + 1.04, -depth / 4], scale: [width + 0.65, 0.22, panelDepth], rotation: [-angle, 0, 0] },
    );
  }
  addCategory(roofs, config.roofColor, 'roof');

  addCategory(createWindows(config), config.windowColor, 'windows', 'plane');

  const doorHeight = Math.min(2.35, floorHeight * 0.78);
  addCategory(
    [{ position: [0, -totalHeight / 2 + doorHeight / 2, depth / 2 + 0.4], scale: [1.25, doorHeight, 1] }],
    config.doorColor,
    'door',
    'plane',
  );

  const accents: Transform[] = [
    // Both tiers are above the ground at y=-0.05 after the parent offset.
    { position: [0, -totalHeight / 2 + 0.08, 0], scale: [width + 1.1, 0.24, depth + 1.1] },
    { position: [0, -totalHeight / 2 - 0.06, 0], scale: [width + 1.7, 0.12, depth + 1.7] },
  ];
  if (architectureStyle === 'Modern') {
    accents.push({
      position: [0, -totalHeight / 2 + floorHeight + 0.15, depth / 2 + 0.7],
      scale: [width * 0.55, 0.16, 1.15],
    });
  }
  if (buildingType === 'Villa') {
    accents.push(
      { position: [-width * 0.33, 0, depth / 2 + 0.72], scale: [0.2, totalHeight, 0.2] },
      { position: [width * 0.33, 0, depth / 2 + 0.72], scale: [0.2, totalHeight, 0.2] },
    );
  }
  addCategory(accents, '#819095', null);

  const geometry = mergeGeometries(geometries, false) ?? new BufferGeometry();
  geometries.forEach((part) => part.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, ranges, totalHeight };
}

export function ProceduralBuilding({
  config,
  onSelect,
  clickBlockRef,
}: {
  config: BuildingConfig;
  selectedPart: SelectedPart;
  onSelect: (part: SelectedPart) => void;
  clickBlockRef: { current: number };
}) {
  const lastTapAt = useRef(0);
  const lastTapPart = useRef<SelectablePart | null>(null);
  const { invalidate } = useThree();
  const model = useMemo(
    () => buildBuildingGeometry(config),
    [
      config.architectureStyle,
      config.buildingType,
      config.depth,
      config.floorHeight,
      config.floors,
      config.roofType,
      config.width,
      config.windowCount,
    ],
  );
  const material = useMemo(
    () => new MeshLambertMaterial({ side: DoubleSide, vertexColors: true }),
    [],
  );

  useEffect(() => () => model.geometry.dispose(), [model.geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    // Geometry remains allocated while colors change. Updating one existing
    // vertex-color buffer avoids old/new geometry frames and preserves the
    // exact chosen color during every camera gesture.
    const colors = model.geometry.getAttribute('color') as BufferAttribute;
    const palette: Record<SelectablePart, string> = {
      walls: config.wallColor,
      roof: config.roofColor,
      windows: config.windowColor,
      door: config.doorColor,
    };
    model.ranges.forEach((range) => {
      if (!range.colorPart) return;
      const color = new Color(palette[range.colorPart]);
      for (let index = range.start; index < range.end; index += 1) {
        colors.setXYZ(index, color.r, color.g, color.b);
      }
    });
    colors.needsUpdate = true;
    invalidate(2);
  }, [
    config.doorColor,
    config.roofColor,
    config.wallColor,
    config.windowColor,
    invalidate,
    model,
  ]);

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (Date.now() < clickBlockRef.current || event.delta > 8) return;
    const faceIndex = event.faceIndex;
    if (faceIndex == null) return;
    const vertexIndex = faceIndex * 3;
    const hit = model.ranges.find(
      (range) => vertexIndex >= range.start && vertexIndex < range.end && range.selectPart,
    );
    if (!hit?.selectPart) return;

    const now = Date.now();
    if (lastTapPart.current === hit.selectPart && now - lastTapAt.current < 360) {
      lastTapAt.current = 0;
      lastTapPart.current = null;
      onSelect(hit.selectPart);
      return;
    }
    lastTapAt.current = now;
    lastTapPart.current = hit.selectPart;
  };

  return (
    <mesh
      dispose={null}
      frustumCulled={false}
      geometry={model.geometry}
      material={material}
      onClick={handleSelect}
      position={[0, model.totalHeight / 2 + 0.18, 0]}
    />
  );
}
