import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface Props { size?: number; }

export function ForgeOrbGL({ size = 160 }: Props) {
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#bf5af2', '#0084ff']}
        style={{
          width: size * 0.55, height: size * 0.55,
          borderRadius: size * 0.275,
          alignItems: 'center', justifyContent: 'center',
        }}
      />
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G>
          <Circle cx={c} cy={c} r={c * 0.7} stroke="#bf5af2" strokeWidth={1} fill="none" opacity={0.3} />
          <Circle cx={c} cy={c} r={c * 0.85} stroke="#4488ff" strokeWidth={0.8} fill="none" opacity={0.2} />
          <Circle cx={c} cy={c} r={c * 0.68} stroke="#FF6B35" strokeWidth={2} fill="none" opacity={0.6} />
          <Circle cx={c * 0.3} cy={c * 0.5} r={5} fill="#FF6B35" opacity={0.8} />
          <Circle cx={c * 1.7} cy={c * 1.4} r={4} fill="#bf5af2" opacity={0.8} />
          <Circle cx={c * 1.6} cy={c * 0.4} r={3} fill="#FF6B35" opacity={0.6} />
        </G>
      </Svg>
    </View>
  );
}
