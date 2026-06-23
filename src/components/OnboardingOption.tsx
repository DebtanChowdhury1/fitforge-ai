import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

interface Props {
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}

export function OnboardingOption({ label, description, icon, selected, onPress }: Props) {
  const scale   = useRef(new Animated.Value(1)).current;
  const bgAnim  = useRef(new Animated.Value(selected ? 1 : 0)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true } as any).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true } as any).start();
    onPress();
  }

  React.useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: selected ? 1 : 0,
      tension: 120, friction: 8, useNativeDriver: false,
    } as any).start();
  }, [selected]);

  const borderColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.08)', '#FF6B35'],
  });
  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.03)', 'rgba(255,107,53,0.12)'],
  });

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 18, marginBottom: 10,
        borderWidth: 1, borderColor, backgroundColor: bgColor,
        transform: [{ scale }],
      }}>
        <View style={{ marginRight: 16 }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 }}>{description}</Text>
        </View>
        {selected && (
          <View style={{
            width: 26, height: 26, borderRadius: 8,
            backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
