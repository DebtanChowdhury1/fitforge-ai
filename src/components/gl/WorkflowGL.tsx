import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G } from 'react-native-svg';

interface Props { width: number; height: number; }

export function WorkflowGL({ width, height }: Props) {
  const stages = [
    { x: 0.1,  y: 0.5,  color: '#44aaff' },
    { x: 0.3,  y: 0.35, color: '#FF6B35' },
    { x: 0.5,  y: 0.25, color: '#bf5af2' },
    { x: 0.7,  y: 0.35, color: '#44ffaa' },
    { x: 0.9,  y: 0.5,  color: '#ffbb33' },
  ];

  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={['#0a0a16', '#0d0820', '#100a0a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width, height }}
      />
      {/* Orange glow blob */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: height * 0.18,
          alignSelf: 'center',
          width: width * 1.1,
          height: width * 1.1,
          borderRadius: width,
          backgroundColor: '#FF6B35',
          opacity: 0.06,
        }}
      />
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <G>
          {/* Connection lines */}
          {stages.slice(0, -1).map((s, i) => (
            <Line
              key={i}
              x1={width * s.x} y1={height * s.y}
              x2={width * stages[i + 1].x} y2={height * stages[i + 1].y}
              stroke="#FF6B35" strokeWidth={1} opacity={0.4}
            />
          ))}
          {/* Stage nodes */}
          {stages.map((s, i) => (
            <G key={i}>
              <Circle cx={width * s.x} cy={height * s.y} r={18} fill={s.color} opacity={0.15} />
              <Circle cx={width * s.x} cy={height * s.y} r={10} fill={s.color} opacity={0.5} />
              <Circle cx={width * s.x} cy={height * s.y} r={6} fill={s.color} opacity={0.9} />
            </G>
          ))}
          {/* Particles */}
          {[
            { x: 0.2, y: 0.7 }, { x: 0.45, y: 0.8 }, { x: 0.75, y: 0.65 },
            { x: 0.6, y: 0.15 }, { x: 0.35, y: 0.6 }, { x: 0.85, y: 0.25 },
          ].map((p, i) => (
            <Circle key={i} cx={width * p.x} cy={height * p.y} r={2.5}
              fill={i % 2 === 0 ? '#FF6B35' : '#bf5af2'} opacity={0.5} />
          ))}
        </G>
      </Svg>
    </View>
  );
}
