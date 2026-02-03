import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClaudeStackParamList } from '../navigation/types';
import WorkspaceList from './WorkspaceList';
import SessionList from './SessionList';
import ConversationView from './ConversationView';
import SubagentView from './SubagentView';
import ToolDetailView from './ToolDetailView';

const Stack = createNativeStackNavigator<ClaudeStackParamList>();

export default function ClaudeTab() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Workspaces" component={WorkspaceList} />
      <Stack.Screen name="Sessions" component={SessionList} />
      <Stack.Screen name="Conversation" component={ConversationView} />
      <Stack.Screen name="Subagent" component={SubagentView} />
      <Stack.Screen name="ToolDetail" component={ToolDetailView} />
    </Stack.Navigator>
  );
}
