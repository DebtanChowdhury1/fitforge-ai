import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface State {
  crashed: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { crashed: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { crashed: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 300));
  }

  reset = () => this.setState({ crashed: false, error: null });

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.inner}>
          <AlertTriangle size={48} color="#FF6B35" strokeWidth={1.5} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            FitForge hit an unexpected error. Your data is safe — tap below to restart.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.dev}>{this.state.error.message}</Text>
          )}
          <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.8}>
            <RefreshCw size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.btnText}>Restart app</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0a0a0f' },
  inner:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:   { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  body:    { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  dev:     { color: '#ff2d55', fontSize: 11, fontFamily: 'monospace', marginBottom: 24, textAlign: 'center' },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
