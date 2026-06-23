import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle, Ellipse, G } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
  autoSpin?: boolean;
}

export function DumbbellGL({ width = 320, height = 160 }: Props) {
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 160;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height}>
        <G x={cx} y={cy}>
          {/* Bar */}
          <Rect x={-70 * scale} y={-5 * scale} width={140 * scale} height={10 * scale} rx={5 * scale} fill="#aabbdd" />

          {/* Left plates */}
          <Rect x={-68 * scale} y={-28 * scale} width={16 * scale} height={56 * scale} rx={4 * scale} fill="#2244aa" />
          <Rect x={-52 * scale} y={-22 * scale} width={12 * scale} height={44 * scale} rx={3 * scale} fill="#2244aa" />

          {/* Right plates */}
          <Rect x={52 * scale} y={-22 * scale} width={12 * scale} height={44 * scale} rx={3 * scale} fill="#2244aa" />
          <Rect x={64 * scale} y={-28 * scale} width={16 * scale} height={56 * scale} rx={4 * scale} fill="#2244aa" />

          {/* Accent rings */}
          <Rect x={-70 * scale} y={-30 * scale} width={4 * scale} height={60 * scale} rx={2 * scale} fill="#FF6B35" />
          <Rect x={66 * scale} y={-30 * scale} width={4 * scale} height={60 * scale} rx={2 * scale} fill="#FF6B35" />

          {/* Grip knurling */}
          {[-18, -9, 0, 9, 18].map(offset => (
            <Rect
              key={offset}
              x={(offset - 2) * scale}
              y={-7 * scale}
              width={4 * scale}
              height={14 * scale}
              rx={2 * scale}
              fill="#111122"
            />
          ))}

          {/* Center glow */}
          <Ellipse cx={0} cy={0} rx={18 * scale} ry={6 * scale} fill="#FF6B35" opacity={0.15} />
        </G>
      </Svg>
    </View>
  );
}
