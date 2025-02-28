import React, { useCallback, useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { conversationsMachine, Conversation, HistoryConversation } from '../machines/conversationsMachine';
import { chatMachine } from '../machines/chatMachine';
import { staticCardsMachine } from '../machines/staticCardsMachine';
import { chatStorage } from '../services/chatStorage';
import { Message } from '../machines/types';
import ConversationsList from './ConversationsList';
import ChatView from './ChatView';
import { StaticCards } from './StaticCards';
import './Layout.css';

interface CurrentChat {
  messages: Message[];
}

interface ConversationWithChat extends Conversation {
  currentChat?: CurrentChat;
}

export const Layout = () => {
  const [conversationsSnapshot, sendToConversations] = useMachine(conversationsMachine);
  const [chatSnapshot, sendToChat] = useMachine(chatMachine);
  const [staticCardsSnapshot, sendToStaticCards] = useMachine(staticCardsMachine);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeConversations = async () => {
      try {
        // Trigger the conversations machine to fetch initial data
        sendToConversations({ type: 'REFRESH_CONVERSATIONS' });
      } catch (error) {
        console.error('Error initializing conversations:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeConversations();
  }, [sendToConversations]);

  const { 
    activeConversations, 
    historyConversations, 
    selectedConversation,
    selectedChatHistory,
    selectedHistoryChat,
    view 
  } = conversationsSnapshot.context;

  // Update static cards when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      sendToStaticCards({
        type: 'SELECT_SHOPPER',
        shopperId: selectedConversation.shopperId
      });
    } else {
      sendToStaticCards({ type: 'CLEAR_CARDS' });
    }
  }, [selectedConversation, sendToStaticCards]);

  const handleStatusChange = (ucid: string, status: string) => {
    console.log('Status change not implemented:', { ucid, status });
  };

  const handleViewHistory = (customerId: string) => {
    console.log('Viewing history for customer:', customerId);
    // Clear chat machine state when viewing history
    sendToChat({
      type: 'CONVERSATION_SELECTED',
      conversationId: null
    });
    sendToConversations({ type: 'CONTACT_HISTORY_CLICK', customerId });
  };

  const handleBackToActive = () => {
    // Clear chat machine state when going back to active
    sendToChat({
      type: 'CONVERSATION_SELECTED',
      conversationId: null
    });
    sendToConversations({ type: 'CONTACT_HISTORY_BACK_CLICK' });
  };

  const handleViewChatHistory = async (conversation: Conversation | HistoryConversation) => {
    try {
      const conversationId = 'ucid' in conversation ? conversation.ucid : conversation.id;
      
      // First update conversations machine
      sendToConversations({
        type: 'VIEW_CHAT_HISTORY',
        conversation
      });

      // Then update chat machine with the conversation
      sendToChat({ 
        type: 'CONVERSATION_SELECTED',
        conversationId
      });

      // Load stored messages for history conversations
      if (!('ucid' in conversation)) {
        const storedMessages = await chatStorage.getChat(conversationId);
        if (storedMessages.length > 0) {
          sendToConversations({
            type: 'UPDATE_CONVERSATION_MESSAGES',
            conversationId,
            messages: storedMessages
          });
        }
      }
    } catch (error) {
      console.error('Error viewing chat history:', error);
    }
  };

  const handleSendMessage = useCallback(async (message: string) => {
    console.log('Sending message:', message);
    if (!selectedConversation && !selectedHistoryChat) return;

    const conversation = selectedConversation || selectedHistoryChat;
    if (!conversation) return;

    const conversationId = 'ucid' in conversation ? conversation.ucid : conversation.id;
    
    // Send to chat machine to process the message
    sendToChat({ 
      type: 'RECEIVED_INPUT', 
      message
    });

  }, [sendToChat, selectedConversation, selectedHistoryChat]);

  // Add effect to handle chat machine state changes
  useEffect(() => {
    const lastMessage = chatSnapshot.context.messages[chatSnapshot.context.messages.length - 1];
    if (!lastMessage || !chatSnapshot.context.conversationId) return;

    // Only update conversations machine when there's a new message
    sendToConversations({
      type: 'UPDATE_CONVERSATION_MESSAGES',
      conversationId: chatSnapshot.context.conversationId,
      messages: chatSnapshot.context.messages
    });

  }, [chatSnapshot.context.messages, chatSnapshot.context.conversationId, sendToConversations]);

  // Add effect to sync selected conversation with chat machine
  useEffect(() => {
    if (selectedConversation) {
      sendToChat({
        type: 'CONVERSATION_SELECTED',
        conversationId: selectedConversation.ucid
      });
    } else if (selectedHistoryChat) {
      sendToChat({
        type: 'CONVERSATION_SELECTED',
        conversationId: selectedHistoryChat.id
      });
    }
  }, [selectedConversation, selectedHistoryChat, sendToChat]);

  const handleBackToList = () => {
    // Clear both machines' states
    sendToConversations({
      type: 'BACK_TO_LIST'
    });
    sendToChat({
      type: 'CONVERSATION_SELECTED',
      conversationId: null
    });
  };

  const handleRefresh = async () => {
    try {
      await chatStorage.clearAll();
      sendToConversations({ type: 'REFRESH_CONVERSATIONS' });
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  const handleNewContact = () => {
    const newConversation: Conversation = {
      ucid: `new_${Date.now()}`,
      state: 'NEW',
      customerName: 'New Contact',
      customerId: `cust_${Date.now()}`,
      shopperId: `${Math.floor(100000 + Math.random() * 900000)}`, // Generate random 6-digit number
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    };

    sendToConversations({ 
      type: 'UPDATE_ACTIVE_CONVERSATIONS',
      conversations: [...activeConversations, newConversation]
    });

    handleViewChatHistory(newConversation);
  };

  if (isInitializing || conversationsSnapshot.matches('initializing')) {
    return <div className="loading-container">Loading conversations...</div>;
  }

  const currentConversation = view === 'history' ? selectedHistoryChat : selectedConversation;
  // Use selectedChatHistory as fallback when switching views
  const currentChatHistory = chatSnapshot.context.messages.length > 0 ? 
    chatSnapshot.context.messages : 
    selectedChatHistory;
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
          onViewChat={handleViewChatHistory}
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
      <div className="static-cards-panel">
        <StaticCards 
          cards={staticCardsSnapshot.context.cards}
          isLoading={staticCardsSnapshot.context.isLoading}
          error={staticCardsSnapshot.context.error}
        />
      </div>
    </div>
  );
};

export default Layout; 