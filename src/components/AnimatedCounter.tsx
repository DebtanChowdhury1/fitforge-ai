import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  value: number;
  style?: TextStyle;
  duration?: number;
  decimals?: number;
}

export function AnimatedCounter({ value, style, duration = 1000, decimals = 0 }: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = startRef.current;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (value - start) * eased;
      setDisplay(current);
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
      else startRef.current = value;
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  return (
    <Text style={style}>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
    </Text>
  );
}
