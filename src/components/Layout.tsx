import React, { useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { conversationsMachine, Conversation, HistoryConversation } from '../machines/conversationsMachine';
import { chatMachine } from '../machines/chatMachine';
import { chatStorage } from '../services/chatStorage';
import { Message } from '../machines/types';
import ConversationsList from './ConversationsList';
import ChatView from './ChatView';
import './Layout.css';

// Mock data for active conversations
const mockData = {
  active: [
    {
      ucid: "123e4567-56-426614174000",
      state: "IN_PROGRESS",
      customerName: "John Doe",
      customerId: "1234",
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    },
    {
      ucid: "123e4567-56-426614171000",
      state: "IN_PROGRESS",
      customerName: "Pranav Sachdeva",
      customerId: "1235",
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    }
  ] as Conversation[]
};

interface CurrentChat {
  messages: Message[];
}

interface ConversationWithChat extends Conversation {
  currentChat?: CurrentChat;
}

const Layout: React.FC = () => {
  const [conversationsSnapshot, sendToConversations] = useMachine(conversationsMachine);
  const [chatSnapshot, sendToChat] = useMachine(chatMachine);

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

  const handleStatusChange = (ucid: string, status: string) => {
    // Status change is not currently supported in the state machine
    console.log('Status change not implemented:', { ucid, status });
  };

  const handleViewHistory = (customerId: string) => {
    console.log('Viewing history for customer:', customerId);
    sendToConversations({ type: 'CONTACT_HISTORY_CLICK', customerId });
  };

  const handleBackToActive = () => {
    sendToConversations({ type: 'CONTACT_HISTORY_BACK_CLICK' });
  };

  const handleViewChat = (conversation: Conversation | HistoryConversation) => {
    console.log('Viewing chat:', conversation);
    
    // First update conversations machine
    sendToConversations({ 
      type: 'VIEW_CHAT_HISTORY', 
      conversation
    });
    
    // Then update chat machine with the conversation
    const conversationId = 'ucid' in conversation ? conversation.ucid : conversation.id;
    const storedMessages = chatStorage.getChat(conversationId);
    const messages = storedMessages.length > 0 ? 
      storedMessages : 
      (view === 'history' && 'messages' in conversation ? 
        conversation.messages : 
        []);
    
    sendToChat({ 
      type: 'CONVERSATION_SELECTED',
      conversationId
    });
  };

  const handleBackToList = () => {
    // Current messages are automatically persisted by the chat machine
    sendToConversations({ type: 'BACK_TO_LIST' });
  };

  const handleSendMessage = useCallback((message: string) => {
    sendToChat({ type: 'RECEIVED_INPUT', message });
  }, [sendToChat]);

  const handleRefresh = () => {
    // Clear stored chats when refreshing
    chatStorage.clearAll();
    // Fetch active conversations again
    sendToConversations({ 
      type: 'UPDATE_ACTIVE_CONVERSATIONS', 
      conversations: mockData.active 
    });
  };

  const handleNewContact = () => {
    const newConversation: Conversation = {
      ucid: `new_${Date.now()}`,
      state: 'NEW',
      customerName: 'New Contact',
      customerId: `cust_${Date.now()}`,
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    };

    // Add the new conversation to active conversations
    sendToConversations({ 
      type: 'UPDATE_ACTIVE_CONVERSATIONS',
      conversations: [...activeConversations, newConversation]
    });

    // Select the new conversation
    sendToConversations({ 
      type: 'VIEW_CHAT_HISTORY',
      conversation: newConversation
    });
  };

  if (conversationsSnapshot.matches('initializing')) {
    return <div className="loading">Loading conversations...</div>;
  }

  const currentConversation = view === 'history' ? selectedHistoryChat : selectedConversation;
  
  // Use chat machine messages if available, otherwise use stored messages
  const currentChatHistory = chatSnapshot.context.messages.length > 0 ? 
    chatSnapshot.context.messages : 
    (currentConversation ? 
      ('ucid' in currentConversation ? 
        chatStorage.getChat(currentConversation.ucid) : 
        currentConversation.messages) : 
      []);

  const isProcessing = chatSnapshot.context.isProcessing;

  return (
    <div className="app-container">
      <div className="navigation-panel">
        <ConversationsList 
          activeConversations={activeConversations}
          historyConversations={historyConversations}
          selectedConversation={selectedConversation}
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
          chatHistory={currentChatHistory as Message[]}
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