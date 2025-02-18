import React from 'react';
import ChatHistory from './ChatHistory';
import './ChatView.css';

const ChatView = ({ 
  selectedConversation,
  chatHistory,
  view,
  onBack,
  onSendMessage
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