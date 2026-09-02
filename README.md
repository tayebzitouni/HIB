# Construction 3D Configurator

A mobile construction configurator built with React Native and Expo. Users enter project details, generate a procedural house, inspect it with touch controls, and edit individual building elements.

## Features

- Guided start, configuration, generation, and 3D viewer flow
- One-finger rotation and two-finger pan/zoom controls
- Double-tap selection for walls, roof, doors, windows, and foundation
- Editable colors and project dimensions
- Saved configuration and colors using on-device storage
- Android and iOS project support

## Technology

- Expo SDK 57 and React Native 0.86
- React Three Fiber and Three.js
- Zustand for isolated application state
- AsyncStorage for local persistence

## Requirements

- Node.js 20 or later
- npm
- Android Studio and an Android SDK for Android builds
- Xcode on macOS for iOS builds

## Install and run

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm start
```

Run an Android development build:

```bash
npm run android
```

Run an iOS development build on macOS:

```bash
npm run ios
```

Check the TypeScript source:

```bash
npm run typecheck
```

## Android test build

From Windows PowerShell:

```powershell
.\android\gradlew.bat -p android :app:assembleDebug
```

The APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`. Configure an owner-controlled production keystore before creating a release build.

## Rendering and memory design

The generated building is merged into one non-indexed geometry and rendered with one lightweight material. Colors are updated directly in the existing color buffer, so editing a color does not recreate the house geometry.

The viewer renders only when the scene changes, disables antialiasing and shadows, uses two inexpensive lights, and dynamically updates the camera clipping range. Gesture state is kept outside React rendering to keep rotation, panning, and zooming responsive on lower-memory devices.

Three.js resources created by the application are disposed when they are replaced or unmounted. The optional `CompressedModel` component supports Draco, Meshopt, and KTX2 assets when external models are required.

## Project structure

```text
App.tsx                              Application screen flow
src/components/ArchitectViewer.tsx   3D canvas and touch camera controls
src/components/ProceduralBuilding.tsx Procedural building geometry and selection
src/components/ProjectForm.tsx       Project configuration form
src/store/useConfiguratorStore.ts    Application state and persistence
android/                             Native Android project
```

## Notes

- Use a physical phone for representative graphics performance.
- The Android package and iOS bundle identifier are currently `com.example.construction3d`; replace them before public distribution.
- Release signing should use the owner's private production keystore. No production signing key is included in the source package.
