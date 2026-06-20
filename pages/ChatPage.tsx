import React from 'react';
import { useApp } from '../context/AppContext';
import EnhancedChatbot from '../components/EnhancedChatbot';

const ChatPage: React.FC = () => {
  return <EnhancedChatbot compact={true} />;
};

export default ChatPage;
