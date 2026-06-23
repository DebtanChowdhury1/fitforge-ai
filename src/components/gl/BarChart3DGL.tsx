import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Bar { label: string; value: number; }
interface Props { data: Bar[]; width: number; height: number; }

export function BarChart3DGL({ data, width, height }: Props) {
  const padBottom = 22;
  const maxBarH = height - padBottom - 8;
  return (
    <View style={{ width, height, backgroundColor: '#0c0c16', paddingHorizontal: 14, paddingTop: 8 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: maxBarH, justifyContent: 'flex-end', width: '62%' }}>
              <LinearGradient
                colors={['#FF6B35', '#ff2d55']}
                style={{
                  width: '100%',
                  height: Math.max(4, maxBarH * Math.min(1, Math.max(0, d.value))),
                  borderRadius: 5,
                }}
              />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 6 }} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
