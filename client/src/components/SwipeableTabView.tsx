// client/src/components/SwipeableTabView.tsx
import React, { useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  tabs: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export default function SwipeableTabView({
  tabs,
  activeIndex,
  onIndexChange,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === 5) {
      // State.END
      const { translationX: tx, velocityX } = event.nativeEvent;

      let newIndex = activeIndex;

      if (tx < -SWIPE_THRESHOLD || velocityX < -500) {
        newIndex = Math.min(activeIndex + 1, tabs.length - 1);
      } else if (tx > SWIPE_THRESHOLD || velocityX > 500) {
        newIndex = Math.max(activeIndex - 1, 0);
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      if (newIndex !== activeIndex) {
        onIndexChange(newIndex);
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {tabs[activeIndex]}
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
