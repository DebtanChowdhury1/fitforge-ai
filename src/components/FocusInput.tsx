import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps, Animated } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  icon?: React.ReactNode;
}

export function FocusInput({ label, error, secureTextEntry, icon, ...props }: Props) {
  const [focused, setFocused]   = useState(false);
  const [hidden, setHidden]     = useState(secureTextEntry ?? false);
  const borderAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;

  function onFocus() {
    setFocused(true);
    Animated.parallel([
      Animated.spring(borderAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: false } as any),
      Animated.timing(glowAnim,   { toValue: 1, duration: 200, useNativeDriver: false }),
    ] as any).start();
  }

  function onBlur() {
    setFocused(false);
    Animated.parallel([
      Animated.spring(borderAnim, { toValue: 0, tension: 120, friction: 8, useNativeDriver: false } as any),
      Animated.timing(glowAnim,   { toValue: 0, duration: 200, useNativeDriver: false }),
    ] as any).start();
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', '#FF6B35'],
  });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  const shadowRadius  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 }}>
          {label.toUpperCase()}
        </Text>
      )}
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor, borderRadius: 14,
        paddingHorizontal: 14,
        shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 0 },
        shadowOpacity, shadowRadius,
      }}>
        {icon && <View style={{ marginRight: 10 }}>{icon}</View>}
        <TextInput
          style={{ flex: 1, color: '#fff', paddingVertical: 14, fontSize: 15 }}
          placeholderTextColor="rgba(255,255,255,0.2)"
          secureTextEntry={hidden}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize="none"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(!hidden)} style={{ padding: 4 }}>
            {hidden
              ? <EyeOff size={18} color="rgba(255,255,255,0.3)" />
              : <Eye    size={18} color="rgba(255,255,255,0.3)" />
            }
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={{ color: '#FF2D55', fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
