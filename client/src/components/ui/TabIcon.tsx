import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TabIconProps {
  color: string;
  size?: number;
}

/**
 * Terminal icon: Rectangle with cursor line at bottom
 */
export function TerminalIcon({ color, size = 24 }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <View
        style={[
          styles.terminalBox,
          {
            borderColor: color,
            width: size * 0.85,
            height: size * 0.7,
            borderRadius: size * 0.1,
          },
        ]}
      >
        {/* Cursor prompt: > _ */}
        <View style={styles.terminalPrompt}>
          <Text style={[styles.terminalCursor, { color, fontSize: size * 0.35 }]}>
            {'> _'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Sessions/Chat icon: Speech bubble shape
 */
export function SessionsIcon({ color, size = 24 }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Main bubble */}
      <View
        style={[
          styles.bubbleMain,
          {
            borderColor: color,
            width: size * 0.8,
            height: size * 0.65,
            borderRadius: size * 0.2,
          },
        ]}
      />
      {/* Bubble tail */}
      <View
        style={[
          styles.bubbleTail,
          {
            borderLeftColor: color,
            borderBottomColor: 'transparent',
            borderLeftWidth: size * 0.2,
            borderBottomWidth: size * 0.15,
            bottom: size * 0.05,
            left: size * 0.15,
          },
        ]}
      />
    </View>
  );
}

/**
 * Files icon: Folder with folded corner
 */
export function FilesIcon({ color, size = 24 }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Folder tab */}
      <View
        style={[
          styles.folderTab,
          {
            backgroundColor: color,
            width: size * 0.35,
            height: size * 0.12,
            borderTopLeftRadius: size * 0.08,
            borderTopRightRadius: size * 0.08,
            left: size * 0.12,
            top: size * 0.15,
          },
        ]}
      />
      {/* Folder body */}
      <View
        style={[
          styles.folderBody,
          {
            borderColor: color,
            width: size * 0.8,
            height: size * 0.55,
            borderRadius: size * 0.08,
            top: size * 0.25,
          },
        ]}
      />
    </View>
  );
}

/**
 * Me/Profile icon: Circle avatar outline
 */
export function MeIcon({ color, size = 24 }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Head circle */}
      <View
        style={[
          styles.avatarHead,
          {
            borderColor: color,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            top: size * 0.08,
          },
        ]}
      />
      {/* Body arc */}
      <View
        style={[
          styles.avatarBody,
          {
            borderColor: color,
            width: size * 0.65,
            height: size * 0.4,
            borderTopLeftRadius: size * 0.35,
            borderTopRightRadius: size * 0.35,
            top: size * 0.52,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Terminal icon
  terminalBox: {
    borderWidth: 1.5,
    justifyContent: 'flex-end',
    paddingBottom: 2,
    paddingLeft: 3,
  },
  terminalPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminalCursor: {
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  // Sessions/Chat icon
  bubbleMain: {
    borderWidth: 1.5,
    position: 'absolute',
    top: 2,
  },
  bubbleTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  // Files icon
  folderTab: {
    position: 'absolute',
  },
  folderBody: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  // Me icon
  avatarHead: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  avatarBody: {
    position: 'absolute',
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
});
