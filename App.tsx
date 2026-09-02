import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';

import { ArchitectViewer } from './src/components/ArchitectViewer';
import { GeneratingScreen } from './src/components/GeneratingScreen';
import { ProjectForm } from './src/components/ProjectForm';
import { ViewerErrorBoundary } from './src/components/ViewerErrorBoundary';
import { WelcomeScreen } from './src/components/WelcomeScreen';
import { useConfiguratorStore } from './src/store/useConfiguratorStore';

export default function App() {
  const screen = useConfiguratorStore((state) => state.screen);
  const setScreen = useConfiguratorStore((state) => state.setScreen);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'welcome' && <WelcomeScreen />}
      {screen === 'form' && <ProjectForm />}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'viewer' && (
        <ViewerErrorBoundary onRecover={() => setScreen('form')}>
          <ArchitectViewer />
        </ViewerErrorBoundary>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#071019',
    // Expo SDK 57 uses Android edge-to-edge windows. Built-in SafeAreaView does
    // not inset Android content, so reserve the system bars once at app level.
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
    paddingBottom: Platform.OS === 'android' ? 24 : 0,
  },
});
