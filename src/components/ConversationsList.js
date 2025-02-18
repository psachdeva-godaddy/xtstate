import React from 'react';
import { useMachine } from '@xstate/react';
import { conversationsMachine } from '../machines/conversationsMachine';
import ConversationsHistory from './ConversationsHistory';
import ChatHistory from './ChatHistory';
import './ConversationsList.css';

const StatusSelect = ({ currentStatus, onStatusChange, ucid }) => {
  const statuses = ['IN_PROGRESS', 'COMPLETED', 'CLOSED'];
  
  return (
    <select 
      value={currentStatus}
      onChange={(e) => onStatusChange(ucid, e.target.value)}
      className="status-select"
    >
      {statuses.map(status => (
        <option key={status} value={status}>
          {status.replace('_', ' ')}
        </option>
      ))}
    </select>
  );
};

const NavigationList = ({ 
  conversations, 
  onStatusChange, 
  onViewChat, 
  onViewHistory,
  selectedConversation,
  isHistoryView,
  historyConversations,
  onBackToActive 
}) => (
  <div className="navigation-content">
    {isHistoryView ? (
      <>
        <div className="history-section">
          <div className="history-header">
            <h3>Chat History</h3>
            <button onClick={onBackToActive} className="back-to-active">
              Back to Active
            </button>
          </div>
          {historyConversations.map((chat) => (
            <div 
              key={chat.id} 
              className={`conversation-card ${selectedConversation?.id === chat.id ? 'active' : ''}`}
              onClick={() => onViewChat(chat)}
            >
              <div className="history-card-header">
                <div className="history-date">Date: {chat.date}</div>
              </div>
              <div className="history-preview">
                {chat.messages && chat.messages.length > 0 && (
                  <div className="preview-message">
                    <span className="message-text">{chat.messages[0].message}</span>
                    <span className="message-count">{chat.messages.length} messages</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    ) : (
      <div className="active-section">
        <h3>Active Conversations</h3>
        {conversations.map((conversation) => (
          <div 
            key={conversation.ucid} 
            className={`conversation-card ${selectedConversation?.ucid === conversation.ucid ? 'active' : ''}`}
          >
            <div className="customer-info">
              <div className="customer-name">{conversation.customerName}</div>
              <div className="customer-id">ID: {conversation.customerId}</div>
            </div>
            <div className="conversation-details">
              <div className="status-container">
                Status: <StatusSelect 
                  currentStatus={conversation.state}
                  onStatusChange={onStatusChange}
                  ucid={conversation.ucid}
                />
              </div>
              <div>Opened: {conversation.opened}</div>
              <div>Updated: {conversation.updated}</div>
            </div>
            <div className="card-actions">
              <button
                onClick={() => onViewChat(conversation)}
                className="view-chat-button"
              >
                View Chat
              </button>
              <button
                onClick={() => onViewHistory(conversation.customerId)}
                className="history-button"
              >
                View History
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ConversationsList = () => {
  const [snapshot, send] = useMachine(conversationsMachine);
  const { 
    activeConversations, 
    historyConversations, 
    selectedConversation, 
    selectedChatHistory,
    selectedHistoryChat,
    view 
  } = snapshot.context;

  const handleRemove = (ucid) => {
    send({ type: 'CONTACT_REMOVED', ucid });
  };

  const handleStatusChange = (ucid, status) => {
    send({ type: 'CHANGE_STATUS', ucid, status });
  };

  const handleViewHistory = (customerId) => {
    send({ type: 'CONTACT_HISTORY_CLICK', customerId });
  };

  const handleBackToActive = () => {
    send({ type: 'CONTACT_HISTORY_BACK_CLICK' });
  };

  const handleViewChat = (conversation) => {
    send({ type: 'VIEW_CHAT_HISTORY', conversation });
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

  if (snapshot.matches('initializing')) {
    return <div className="loading">Loading conversations...</div>;
  }

  const isHistoryView = view === 'history';

  return (
    <div className="app-container">
      <div className="navigation-panel">
        <div className="navigation-header">
          <div className="button-group">
            <button onClick={() => send({ type: 'REFRESH' })}>
              Refresh
            </button>
            <button onClick={() => send({ type: 'NEW_CONTACT' })}>
              New Contact
            </button>
          </div>
        </div>
        <NavigationList 
          conversations={activeConversations}
          onStatusChange={handleStatusChange}
          onViewChat={handleViewChat}
          onViewHistory={handleViewHistory}
          selectedConversation={selectedConversation}
          isHistoryView={isHistoryView}
          historyConversations={historyConversations}
          onBackToActive={handleBackToActive}
        />
      </div>

      <div className="chat-panel">
        {(selectedConversation || selectedHistoryChat) ? (
          <ChatHistory
            conversation={selectedHistoryChat || selectedConversation}
            chatHistory={selectedChatHistory}
            onBack={handleBackToList}
            onSendMessage={view === 'history' ? undefined : handleSendMessage}
            isHistoryView={view === 'history'}
          />
        ) : (
          <div className="welcome-message">
            Select a conversation to view the chat
          </div>
        )}
      </div>

      {snapshot.context.error && (
        <div className="error-message">
          Error: {snapshot.context.error}
        </div>
      )}
    </div>
  );
};

export default ConversationsList; 