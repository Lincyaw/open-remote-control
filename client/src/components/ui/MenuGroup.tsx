import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';

interface MenuGroupProps {
  children: React.ReactNode;
}

export default function MenuGroup({ children }: MenuGroupProps) {
  const childArray = React.Children.toArray(children);
  return (
    <View style={styles.container}>
      {childArray.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isLast: index === childArray.length - 1,
          });
        }
        return child;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
});
