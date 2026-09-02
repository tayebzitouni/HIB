import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode; onRecover: () => void };
type State = { failed: boolean };

export class ViewerErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D viewer recovered from an error', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <View style={styles.root}>
        <View style={styles.icon}><Text style={styles.iconText}>3D</Text></View>
        <Text style={styles.title}>The 3D viewer needs a restart</Text>
        <Text style={styles.copy}>
          Your design is saved. Return to the form and generate it again with safe settings.
        </Text>
        <Pressable onPress={this.props.onRecover} style={styles.button}>
          <Text style={styles.buttonText}>Return to design</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#071019' },
  icon: { width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#123c33' },
  iconText: { color: '#55dfb9', fontSize: 18, fontWeight: '900' },
  title: { color: '#f3f7f9', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 22 },
  copy: { maxWidth: 330, color: '#849ba7', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  button: { width: '100%', maxWidth: 330, marginTop: 24, paddingVertical: 16, alignItems: 'center', borderRadius: 14, backgroundColor: '#55dfb9' },
  buttonText: { color: '#06251d', fontSize: 14, fontWeight: '900' },
});
