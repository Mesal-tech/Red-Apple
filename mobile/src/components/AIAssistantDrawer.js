import React from 'react';
import AIAssistantScreen from '../screens/AIAssistantScreen';

/**
 * AIAssistantDrawer compatibility wrapper
 * The AI Assistant now has a dedicated page (AIAssistantScreen).
 */
export default function AIAssistantDrawer(props) {
  if (!props.visible) return null;
  return <AIAssistantScreen {...props} />;
}
