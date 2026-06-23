import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Line } from 'react-native-svg';

interface Props { width: number; height: number; }

export function HeroSceneGL({ width, height }: Props) {
  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={['#0a0a0f', '#0d0820', '#0a0a0f']}
        style={{ position: 'absolute', width, height }}
      />
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <G>
          {/* Ambient glow circles */}
          <Circle cx={width * 0.3} cy={height * 0.4} r={width * 0.28} fill="#bf5af2" opacity={0.07} />
          <Circle cx={width * 0.75} cy={height * 0.55} r={width * 0.22} fill="#FF6B35" opacity={0.07} />
          <Circle cx={width * 0.5} cy={height * 0.5} r={width * 0.18} fill="#0066ff" opacity={0.05} />

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <Line key={`h${i}`} x1={0} y1={height * t} x2={width} y2={height * t}
              stroke="#ffffff" strokeWidth={0.4} opacity={0.04} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
            <Line key={`v${i}`} x1={width * t} y1={0} x2={width * t} y2={height}
              stroke="#ffffff" strokeWidth={0.4} opacity={0.04} />
          ))}

          {/* Floating particles */}
          {[
            { cx: 0.15, cy: 0.25, r: 3, c: '#FF6B35' },
            { cx: 0.82, cy: 0.18, r: 2.5, c: '#bf5af2' },
            { cx: 0.65, cy: 0.75, r: 3.5, c: '#FF6B35' },
            { cx: 0.28, cy: 0.72, r: 2, c: '#44aaff' },
            { cx: 0.9, cy: 0.6, r: 3, c: '#FF6B35' },
            { cx: 0.45, cy: 0.12, r: 2, c: '#bf5af2' },
          ].map((p, i) => (
            <Circle key={i} cx={width * p.cx} cy={height * p.cy} r={p.r} fill={p.c} opacity={0.6} />
          ))}

          {/* Central orb */}
          <Circle cx={width * 0.5} cy={height * 0.5} r={width * 0.08} fill="#bf5af2" opacity={0.15} />
          <Circle cx={width * 0.5} cy={height * 0.5} r={width * 0.06} fill="#bf5af2" opacity={0.25} />
          <Ellipse cx={width * 0.5} cy={height * 0.5} rx={width * 0.08} ry={width * 0.008}
            stroke="#FF6B35" strokeWidth={2} fill="none" opacity={0.5} />
        </G>
      </Svg>
    </View>
  );
}
