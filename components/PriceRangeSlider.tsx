import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, PanResponder } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const MIN = 0;
const MAX = 500000;
const STEP = 10000;

interface PriceRangeSliderProps {
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
}

export function PriceRangeSlider({ minValue, maxValue, onChange }: PriceRangeSliderProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const activeThumbRef = useRef<'min' | 'max' | null>(null);
  const startValuesRef = useRef({ min: 0, max: 0 });

  const getPercent = useCallback((val: number) => (val - MIN) / (MAX - MIN), []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt, gestureState) => {
          if (!trackWidth) return;
          const { locationX } = evt.nativeEvent;

          // Determine which thumb is closer to the touch
          const minPos = getPercent(minValue) * trackWidth;
          const maxPos = getPercent(maxValue) * trackWidth;

          const distToMin = Math.abs(locationX - minPos);
          const distToMax = Math.abs(locationX - maxPos);

          const active = distToMin < distToMax ? 'min' : 'max';
          activeThumbRef.current = active;
          startValuesRef.current = { min: minValue, max: maxValue };

          // Handle tap interaction immediately
          const percentage = Math.max(0, Math.min(1, locationX / trackWidth));
          const rawVal = MIN + percentage * (MAX - MIN);
          const roundedVal = Math.round(rawVal / STEP) * STEP;

          if (active === 'min') {
            const nextMin = Math.max(MIN, Math.min(roundedVal, maxValue - STEP));
            onChange(nextMin, maxValue);
            startValuesRef.current.min = nextMin;
          } else {
            const nextMax = Math.max(minValue + STEP, Math.min(roundedVal, MAX));
            onChange(minValue, nextMax);
            startValuesRef.current.max = nextMax;
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!trackWidth || !activeThumbRef.current) return;

          const deltaX = gestureState.dx;
          const deltaValue = (deltaX / trackWidth) * (MAX - MIN);

          if (activeThumbRef.current === 'min') {
            const rawVal = startValuesRef.current.min + deltaValue;
            const roundedVal = Math.round(rawVal / STEP) * STEP;
            const nextMin = Math.max(MIN, Math.min(roundedVal, maxValue - STEP));
            onChange(nextMin, maxValue);
          } else {
            const rawVal = startValuesRef.current.max + deltaValue;
            const roundedVal = Math.round(rawVal / STEP) * STEP;
            const nextMax = Math.max(minValue + STEP, Math.min(roundedVal, MAX));
            onChange(minValue, nextMax);
          }
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        }
      }),
    [trackWidth, minValue, maxValue, onChange, getPercent]
  );

  const minPercent = getPercent(minValue);
  const maxPercent = getPercent(maxValue);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        {minValue.toLocaleString()} — {maxValue.toLocaleString()} FCFA
      </Text>
      
      <View
        style={styles.sliderWrapper}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {/* Background Track */}
        <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.border }]} />
        
        {/* Highlighted Active Range */}
        <View
          pointerEvents="none"
          style={[
            styles.activeTrack,
            {
              left: `${minPercent * 100}%`,
              width: `${(maxPercent - minPercent) * 100}%`,
              backgroundColor: colors.text,
            }
          ]}
        />
        
        {/* Min Thumb */}
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: `${minPercent * 100}%`,
              backgroundColor: colors.surface,
              borderColor: colors.text,
            }
          ]}
        />
        
        {/* Max Thumb */}
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: `${maxPercent * 100}%`,
              backgroundColor: colors.surface,
              borderColor: colors.text,
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 16, fontWeight: '700' },
  sliderWrapper: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  activeTrack: {
    height: 4,
    position: 'absolute',
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    transform: [{ translateX: -12 }],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  }
});
