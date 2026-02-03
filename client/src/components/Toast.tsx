import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useToastStore, Toast as ToastType } from '../store/toastStore';
import { colors, spacing, typography, radius, shadows, animation } from '../theme';

const TOAST_COLORS = {
  success: { bg: colors.success, text: colors.text.inverse },
  error: { bg: colors.error, text: colors.text.inverse },
  warning: { bg: colors.warning, text: colors.text.inverse },
  info: { bg: colors.info, text: colors.text.inverse },
};

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animation.normal,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: animation.normal,
        useNativeDriver: true,
      }),
    ]).start();

    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const toastColors = TOAST_COLORS[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: toastColors.bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.toastContent}
        activeOpacity={animation.activeOpacity}
      >
        <Text style={[styles.toastText, { color: toastColors.text }]}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.base,
    right: spacing.base,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    maxWidth: '100%',
    minWidth: 200,
    ...shadows.lg,
  },
  toastContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  toastText: {
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
