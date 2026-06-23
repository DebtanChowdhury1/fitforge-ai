import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Ellipse, Rect, Path, Circle } from 'react-native-svg';

type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'glutes' | 'full';

interface Props {
  active?: MuscleGroup[];
  size?: number;
}

const MUSCLE_COLOR = '#ff5500';
const INACTIVE = 'rgba(255,255,255,0.08)';

export function MuscleMap({ active = [], size = 160 }: Props) {
  const isActive = (m: MuscleGroup) => active.includes(m) || active.includes('full');
  const c = (m: MuscleGroup) => isActive(m) ? MUSCLE_COLOR : INACTIVE;
  const glow = active.length > 0 ? MUSCLE_COLOR : 'transparent';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size * 2.2} viewBox="0 0 100 220">
        {/* Head */}
        <Ellipse cx="50" cy="12" rx="11" ry="13" fill="rgba(255,255,255,0.12)" />
        {/* Neck */}
        <Rect x="44" y="24" width="12" height="8" rx="3" fill="rgba(255,255,255,0.1)" />

        {/* Shoulders */}
        <Ellipse cx="28" cy="40" rx="12" ry="8" fill={c('shoulders')} opacity={0.9} />
        <Ellipse cx="72" cy="40" rx="12" ry="8" fill={c('shoulders')} opacity={0.9} />

        {/* Chest */}
        <Ellipse cx="40" cy="50" rx="10" ry="12" fill={c('chest')} opacity={0.9} />
        <Ellipse cx="60" cy="50" rx="10" ry="12" fill={c('chest')} opacity={0.9} />

        {/* Core / Abs */}
        <Rect x="42" y="62" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />
        <Rect x="51" y="62" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />
        <Rect x="42" y="71" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />
        <Rect x="51" y="71" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />
        <Rect x="42" y="80" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />
        <Rect x="51" y="80" width="7" height="7" rx="2" fill={c('core')} opacity={0.9} />

        {/* Arms (biceps) */}
        <Ellipse cx="20" cy="60" rx="7" ry="14" fill={c('arms')} opacity={0.9} />
        <Ellipse cx="80" cy="60" rx="7" ry="14" fill={c('arms')} opacity={0.9} />
        {/* Forearms */}
        <Ellipse cx="17" cy="85" rx="5" ry="12" fill={c('arms')} opacity={0.6} />
        <Ellipse cx="83" cy="85" rx="5" ry="12" fill={c('arms')} opacity={0.6} />

        {/* Back (shown as outline behind chest) */}
        <Ellipse cx="50" cy="55" rx="18" ry="22" fill="none" stroke={c('back')} strokeWidth="3" opacity={0.6} />

        {/* Glutes */}
        <Ellipse cx="41" cy="105" rx="10" ry="10" fill={c('glutes')} opacity={0.9} />
        <Ellipse cx="59" cy="105" rx="10" ry="10" fill={c('glutes')} opacity={0.9} />

        {/* Quads */}
        <Ellipse cx="39" cy="132" rx="9" ry="18" fill={c('legs')} opacity={0.9} />
        <Ellipse cx="61" cy="132" rx="9" ry="18" fill={c('legs')} opacity={0.9} />

        {/* Calves */}
        <Ellipse cx="38" cy="162" rx="7" ry="14" fill={c('legs')} opacity={0.7} />
        <Ellipse cx="62" cy="162" rx="7" ry="14" fill={c('legs')} opacity={0.7} />

        {/* Feet */}
        <Ellipse cx="37" cy="178" rx="8" ry="4" fill="rgba(255,255,255,0.08)" />
        <Ellipse cx="63" cy="178" rx="8" ry="4" fill="rgba(255,255,255,0.08)" />
      </Svg>
    </View>
  );
}

export function getMuscleGroups(exerciseName: string): MuscleGroup[] {
  const name = exerciseName.toLowerCase();
  if (name.includes('bench') || name.includes('push') || name.includes('fly') || name.includes('chest')) return ['chest', 'arms', 'shoulders'];
  if (name.includes('squat') || name.includes('leg press') || name.includes('lunge')) return ['legs', 'glutes', 'core'];
  if (name.includes('deadlift') || name.includes('row') || name.includes('pull') || name.includes('lat')) return ['back', 'arms', 'core'];
  if (name.includes('shoulder') || name.includes('press') || name.includes('lateral') || name.includes('military')) return ['shoulders', 'arms'];
  if (name.includes('curl') || name.includes('bicep') || name.includes('tricep') || name.includes('dip')) return ['arms'];
  if (name.includes('plank') || name.includes('crunch') || name.includes('ab') || name.includes('core')) return ['core'];
  if (name.includes('hip') || name.includes('glute') || name.includes('rdl')) return ['glutes', 'legs'];
  if (name.includes('calf') || name.includes('hamstring')) return ['legs'];
  if (name.includes('run') || name.includes('cardio') || name.includes('bike')) return ['full'];
  return ['full'];
}
