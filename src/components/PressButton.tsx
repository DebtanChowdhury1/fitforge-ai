import React, { useRef } from 'react';
import {
  Animated, TouchableWithoutFeedback,
  View, Text, ActivityIndicator, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const VARIANTS = {
  primary:   { colors: ['#FF6B35', '#FF2D55'] as const, text: '#fff' },
  secondary: { colors: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)'] as const, text: '#fff' },
  ghost:     { colors: ['transparent', 'transparent'] as const, text: '#FF6B35' },
  danger:    { colors: ['#7f1d1d', '#991b1b'] as const, text: '#fca5a5' },
};

export function PressButton({ title, onPress, variant = 'primary', loading, disabled, style, icon }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  function onPressIn() {
    if (reduceMotion) return;
    // Only native-driver on the transform — shadow is static to avoid driver mixing
    Animated.spring(scale, { toValue: 0.96, tension: 300, friction: 10, useNativeDriver: true } as any).start();
  }

  function onPressOut() {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true } as any).start();
  }

  const v = VARIANTS[variant];
  const opacity = disabled || loading ? 0.45 : 1;

  // Static shadow — no JS-driver animation on same view as native transform
  const activeShadow = !loading && !disabled && variant === 'primary';

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
    >
      <Animated.View style={[{
        opacity,
        transform: [{ scale }],
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: activeShadow ? 16 : 0,
        shadowOpacity: activeShadow ? 0.45 : 0,
        elevation: activeShadow ? 8 : 0,
        borderRadius: 16,
        overflow: 'hidden',
      }, style]}>
        <LinearGradient
          colors={v.colors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 17, paddingHorizontal: 24,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.08)',
            borderRadius: 16,
          }}
        >
          {loading ? (
            <ActivityIndicator color={v.text} size="small" />
          ) : (
            <>
              {icon}
              <Text style={{ color: v.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
