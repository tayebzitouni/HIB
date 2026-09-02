import { useLoader, useThree } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import { Mesh, Texture, type Material, type Object3D } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

type CompressedModelProps = {
  dracoDecoderPath: string;
  ktx2TranscoderPath: string;
  url: string;
};

const cloneMaterialTextures = (material: Material): Material => {
  const clone = material.clone();
  const properties = clone as unknown as Record<string, unknown>;

  Object.entries(properties).forEach(([key, value]) => {
    if (value instanceof Texture) {
      properties[key] = value.clone();
    }
  });
  return clone;
};

const disposeObject = (root: Object3D) => {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;

    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const properties = material as unknown as Record<string, unknown>;
      Object.values(properties).forEach((value) => {
        if (value instanceof Texture) value.dispose();
      });
      material.dispose();
    });
  });
};

/**
 * Optional external-asset path. The default configurator is procedural and does
 * not mount this component. When a base model is required, this loader enables:
 * - Draco geometry decompression
 * - Meshopt geometry/animation decompression
 * - KTX2/Basis GPU texture transcoding
 *
 * Decoder/transcoder directories should be versioned with the app or served by
 * a pinned CDN URL. A trailing slash is required by the Three.js loaders.
 */
export function CompressedModel({
  dracoDecoderPath,
  ktx2TranscoderPath,
  url,
}: CompressedModelProps) {
  const { gl } = useThree();
  const decoderResources = useRef<{ draco?: DRACOLoader; ktx2?: KTX2Loader }>({});

  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const draco = new DRACOLoader(loader.manager);
    draco.setDecoderPath(dracoDecoderPath);

    const ktx2 = new KTX2Loader(loader.manager);
    ktx2.setTranscoderPath(ktx2TranscoderPath);
    ktx2.detectSupport(gl);

    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.setKTX2Loader(ktx2);
    decoderResources.current = { draco, ktx2 };
  }) as GLTF;

  const scene = useMemo(() => {
    // useLoader caches the source GLTF. A deep resource clone lets this instance
    // dispose safely without corrupting the shared loader cache.
    const clone = cloneSkeleton(gltf.scene);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry = object.geometry.clone();
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterialTextures)
        : cloneMaterialTextures(object.material);
      object.castShadow = false;
      object.receiveShadow = false;
    });
    return clone;
  }, [gltf.scene]);

  useEffect(
    () => () => {
      disposeObject(scene);
      decoderResources.current.draco?.dispose();
      decoderResources.current.ktx2?.dispose();
    },
    [scene],
  );

  return <primitive dispose={null} object={scene} />;
}
