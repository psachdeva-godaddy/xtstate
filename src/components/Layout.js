import React from 'react';
import { useMachine } from '@xstate/react';
import { conversationsMachine } from '../machines/conversationsMachine';
import ConversationsList from './ConversationsList';
import ChatView from './ChatView';
import './Layout.css';

const Layout = () => {
  const [snapshot, send] = useMachine(conversationsMachine);
  const { 
    activeConversations, 
    historyConversations, 
    selectedConversation,
    selectedChatHistory,
    selectedHistoryChat,
    view 
  } = snapshot.context;

  console.log('Layout render:', {
    view,
    historyConversations,
    selectedConversation,
    selectedChatHistory,
    selectedHistoryChat,
    state: snapshot.value
  });

  const handleStatusChange = (ucid, status) => {
    send({ type: 'CHANGE_STATUS', ucid, status });
  };

  const handleViewHistory = (customerId) => {
    console.log('Viewing history for customer:', customerId);
    send({ type: 'CONTACT_HISTORY_CLICK', customerId });
  };

  const handleBackToActive = () => {
    send({ type: 'CONTACT_HISTORY_BACK_CLICK' });
  };

  const handleViewChat = (conversation) => {
    console.log('Viewing chat:', conversation);
    send({ 
      type: 'VIEW_CHAT_HISTORY', 
      conversation: {
        ...conversation,
        currentChat: view === 'history' ? { messages: conversation.messages } : conversation.currentChat
      }
    });
  };

  const handleBackToList = () => {
    send({ type: 'BACK_TO_LIST' });
  };

  const handleSendMessage = (message) => {
    send({ 
      type: 'ADD_CHAT_MESSAGE', 
      message,
      sender: 'agent'
    });
  };

  const handleRefresh = () => {
    send({ type: 'REFRESH' });
  };

  const handleNewContact = () => {
    send({ type: 'NEW_CONTACT' });
  };

  if (snapshot.matches('initializing')) {
    return <div className="loading">Loading conversations...</div>;
  }

  const currentConversation = view === 'history' ? selectedHistoryChat : selectedConversation;
  const currentChatHistory = view === 'history' ? 
    (selectedHistoryChat?.messages || []) : 
    (selectedChatHistory || []);

  return (
    <div className="app-container">
      <div className="navigation-panel">
        <ConversationsList 
          activeConversations={activeConversations}
          historyConversations={historyConversations}
          selectedConversation={currentConversation}
          view={view}
          onStatusChange={handleStatusChange}
          onViewChat={handleViewChat}
          onViewHistory={handleViewHistory}
          onBackToActive={handleBackToActive}
          onRefresh={handleRefresh}
          onNewContact={handleNewContact}
          error={snapshot.context.error}
        />
      </div>
      <div className="chat-panel">
        <ChatView 
          selectedConversation={currentConversation}
          chatHistory={currentChatHistory}
          view={view}
          onBack={handleBackToList}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default Layout; 