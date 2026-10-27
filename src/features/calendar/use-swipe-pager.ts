import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SLIDE_MS = 200;
/** Share of the width to drag before letting go turns the page. */
const TURN_SHARE = 0.25;
/** A quick flick turns the page even when it barely moved. */
const FLICK_VELOCITY = 600;

/**
 * Drag-to-page for the week strip and the month grid: the content follows the finger and, once
 * dragged far enough (or flicked), slides out while the next page slides in from the other side;
 * otherwise it springs back. `page` identifies what's shown (e.g. the week's key), so the slide-in
 * starts only once the new page has rendered. `go` turns the page with the same slide, for arrows.
 */
export function useSwipePager(page: string, onChange: (delta: -1 | 1) => void) {
  const width = useSharedValue(0);
  const offset = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  // Which way the last turn went, until the new page renders and slides in.
  const pending = useRef<-1 | 1 | null>(null);
  // The gesture may hold on to an old callback; always call the latest one.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const turn = useCallback((delta: -1 | 1) => {
    pending.current = delta;
    void Haptics.selectionAsync();
    onChangeRef.current(delta);
  }, []);

  useEffect(() => {
    const delta = pending.current;
    pending.current = null;
    if (delta === null || reduceMotion) {
      offset.set(0);
      return;
    }
    // The old page left on one side; the new one comes in from the other.
    offset.set(delta * width.get());
    offset.set(withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }));
  }, [offset, page, reduceMotion, width]);

  const slideOut = (delta: -1 | 1) => {
    'worklet';
    offset.set(withTiming(-delta * width.get(), { duration: SLIDE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(turn, delta);
    }));
  };

  const gesture = usePanGesture({
    // Horizontal only: a vertical drag fails it, so the screen still scrolls.
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (event) => {
      'worklet';
      offset.set(event.translationX);
    },
    onDeactivate: (event) => {
      'worklet';
      const threshold = width.get() * TURN_SHARE;
      const next = event.translationX < -threshold || event.velocityX < -FLICK_VELOCITY;
      const previous = event.translationX > threshold || event.velocityX > FLICK_VELOCITY;
      if (event.canceled || next === previous) {
        offset.set(withSpring(0, { damping: 20, stiffness: 240 }));
        return;
      }
      slideOut(next ? 1 : -1);
    },
  });

  const go = (delta: -1 | 1) => {
    if (reduceMotion) turn(delta);
    else slideOut(delta);
  };

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const onLayout = (event: LayoutChangeEvent) => {
    width.set(event.nativeEvent.layout.width);
  };

  return { gesture, style, onLayout, go };
}
