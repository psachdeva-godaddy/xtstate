import React, { useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { conversationsMachine } from '../machines/conversationsMachine';
import { chatMachine, chatEvents } from '../machines/chatMachine';
import { chatStorage } from '../services/chatStorage';
import ConversationsList from './ConversationsList';
import ChatView from './ChatView';
import './Layout.css';

const Layout = () => {
  const [conversationsSnapshot, sendToConversations] = useMachine(conversationsMachine);
  const [chatSnapshot, sendToChat] = useMachine(chatMachine, {
    context: {
      onConversationUpdate: ({ conversationId, messages }) => {
        // Update conversations machine with new messages
        sendToConversations({ 
          type: 'UPDATE_CONVERSATION_MESSAGES', 
          conversationId, 
          messages 
        });
      }
    }
  });

  // Initialize conversations with stored messages
  useEffect(() => {
    const storedChats = chatStorage.getAllChats();
    if (Object.keys(storedChats).length > 0) {
      const updatedConversations = conversationsSnapshot.context.activeConversations.map(conv => {
        const storedMessages = storedChats[conv.ucid];
        if (storedMessages) {
          return {
            ...conv,
            currentChat: {
              ...conv.currentChat,
              messages: storedMessages
            }
          };
        }
        return conv;
      });

      sendToConversations({
        type: 'UPDATE_ACTIVE_CONVERSATIONS',
        conversations: updatedConversations
      });
    }
  }, []);

  const { 
    activeConversations, 
    historyConversations, 
    selectedConversation,
    selectedChatHistory,
    selectedHistoryChat,
    view 
  } = conversationsSnapshot.context;

  console.log('Layout render:', {
    view,
    historyConversations,
    selectedConversation,
    selectedChatHistory,
    selectedHistoryChat,
    state: conversationsSnapshot.value,
    chatState: chatSnapshot.value,
    currentMessages: chatSnapshot.context.messages,
    storedChats: chatStorage.getAllChats()
  });

  const handleStatusChange = (ucid, status) => {
    sendToConversations({ type: 'CHANGE_STATUS', ucid, status });
  };

  const handleViewHistory = (customerId) => {
    console.log('Viewing history for customer:', customerId);
    sendToConversations({ type: 'CONTACT_HISTORY_CLICK', customerId });
  };

  const handleBackToActive = () => {
    sendToConversations({ type: 'CONTACT_HISTORY_BACK_CLICK' });
  };

  const handleViewChat = (conversation) => {
    console.log('Viewing chat:', conversation);
    
    // First update conversations machine
    sendToConversations({ 
      type: 'VIEW_CHAT_HISTORY', 
      conversation: {
        ...conversation,
        currentChat: view === 'history' ? 
          { messages: conversation.messages } : 
          conversation.currentChat
      }
    });
    
    // Then update chat machine with the conversation
    const storedMessages = chatStorage.getChat(conversation.ucid);
    const messages = storedMessages.length > 0 ? 
      storedMessages : 
      (view === 'history' ? 
        conversation.messages : 
        (conversation.currentChat?.messages || []));
    
    sendToChat(chatEvents.selectConversation(
      conversation.ucid,
      messages
    ));
  };

  const handleBackToList = () => {
    // Current messages are automatically persisted by the chat machine
    sendToConversations({ type: 'BACK_TO_LIST' });
  };

  const handleSendMessage = useCallback((message) => {
    sendToChat(chatEvents.sendMessage(message));
  }, [sendToChat]);

  const handleRefresh = () => {
    // Clear stored chats when refreshing
    chatStorage.clearAll();
    sendToConversations({ type: 'REFRESH' });
  };

  const handleNewContact = () => {
    sendToConversations({ type: 'NEW_CONTACT' });
  };

  if (conversationsSnapshot.matches('initializing')) {
    return <div className="loading">Loading conversations...</div>;
  }

  const currentConversation = view === 'history' ? selectedHistoryChat : selectedConversation;
  
  // Use chat machine messages if available, otherwise use stored messages
  const currentChatHistory = chatSnapshot.context.messages.length > 0 ? 
    chatSnapshot.context.messages : 
    (currentConversation?.ucid ? 
      chatStorage.getChat(currentConversation.ucid) : 
      (view === 'history' ? 
        (selectedHistoryChat?.messages || []) : 
        (selectedChatHistory || [])));

  const isProcessing = chatSnapshot.context.isProcessing;

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
          error={conversationsSnapshot.context.error}
        />
      </div>
      <div className="chat-panel">
        <ChatView 
          selectedConversation={currentConversation}
          chatHistory={currentChatHistory}
          view={view}
          onBack={handleBackToList}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          error={chatSnapshot.context.error}
        />
      </div>
    </div>
  );
};

export default Layout; 