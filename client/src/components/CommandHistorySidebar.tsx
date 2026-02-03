import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useTerminalStore } from '../store/terminalStore';
import { colors, spacing, typography, radius, animation } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectCommand: (command: string) => void;
}

export default function CommandHistorySidebar({
  visible,
  onClose,
  onSelectCommand,
}: Props) {
  const { commandHistory, clearHistory } = useTerminalStore();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: animation.normal,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const handleSelectCommand = (command: string) => {
    onSelectCommand(command);
    onClose();
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.commandItem}
      onPress={() => handleSelectCommand(item)}
      activeOpacity={animation.activeOpacity}
    >
      <Text style={styles.commandIndex}>{index + 1}</Text>
      <Text style={styles.commandText} numberOfLines={2}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Command History</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </View>

        {commandHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No commands yet</Text>
          </View>
        ) : (
          <FlatList
            data={commandHistory}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${index}-${item}`}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {commandHistory.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearHistory}
            activeOpacity={animation.activeOpacity}
          >
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.codeBg,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: typography.size.headline,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.semibold,
  },
  list: {
    flex: 1,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  commandIndex: {
    width: 28,
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  commandText: {
    flex: 1,
    fontSize: typography.size.subheadline,
    color: colors.codeFg,
    fontFamily: 'Menlo',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.subheadline,
    color: colors.text.tertiary,
  },
  clearButton: {
    margin: spacing.base,
    padding: spacing.md,
    backgroundColor: '#333',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.error,
    fontSize: typography.size.subheadline,
    fontWeight: typography.weight.semibold,
  },
});
