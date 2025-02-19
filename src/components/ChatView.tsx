import React from 'react';
import ChatHistory from './ChatHistory';
import { Message } from '../machines/types';
import { Conversation, HistoryConversation } from '../machines/conversationsMachine';
import './ChatView.css';

interface ChatViewProps {
  selectedConversation: Conversation | HistoryConversation | null;
  chatHistory: Message[];
  view: 'active' | 'history';
  onBack: () => void;
  onSendMessage?: (message: string) => void;
  isProcessing: boolean;
  error: Error | null;
}

const ChatView: React.FC<ChatViewProps> = ({ 
  selectedConversation,
  chatHistory,
  view,
  onBack,
  onSendMessage,
  isProcessing,
  error
}) => {
  return (
    <>
      {selectedConversation ? (
        <ChatHistory
          conversation={selectedConversation}
          chatHistory={chatHistory}
          onBack={onBack}
          onSendMessage={view === 'history' ? undefined : onSendMessage}
          isHistoryView={view === 'history'}
          isProcessing={isProcessing}
          error={error}
        />
      ) : (
        <div className="welcome-message">
          Select a conversation to view the chat
        </div>
      )}
    </>
  );
};

export default ChatView; 