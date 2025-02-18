import React from 'react';
import './ConversationsList.css';

const NavigationList = ({ 
  conversations, 
  onStatusChange, 
  onViewChat, 
  onViewHistory,
  selectedConversation,
  isHistoryView,
  historyConversations,
  onBackToActive 
}) => {
  console.log('NavigationList render:', {
    isHistoryView,
    historyConversations,
    selectedConversation
  });

  return (
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
            {historyConversations && historyConversations.length > 0 ? (
              historyConversations.map((chat) => (
                <div 
                  key={chat.id} 
                  className={`conversation-card ${selectedConversation?.customerId === chat.customerId ? 'active' : ''}`}
                  onClick={() => onViewChat({
                    ...chat,
                    ucid: chat.id,
                    state: 'COMPLETED'
                  })}
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
              ))
            ) : (
              <div className="no-history">No chat history available</div>
            )}
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
                <div>Status: {conversation.state.replace('_', ' ')}</div>
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
};

const ConversationsList = ({ 
  activeConversations, 
  historyConversations, 
  selectedConversation,
  view,
  onStatusChange,
  onViewChat,
  onViewHistory,
  onBackToActive,
  onRefresh,
  onNewContact,
  error
}) => {
  const isHistoryView = view === 'history';
  
  console.log('ConversationsList render:', {
    view,
    isHistoryView,
    historyConversations,
    selectedConversation
  });

  return (
    <>
      <div className="navigation-header">
        <div className="button-group">
          <button onClick={onRefresh}>
            Refresh
          </button>
          <button onClick={onNewContact}>
            New Contact
          </button>
        </div>
      </div>
      <NavigationList 
        conversations={activeConversations}
        onStatusChange={onStatusChange}
        onViewChat={onViewChat}
        onViewHistory={onViewHistory}
        selectedConversation={selectedConversation}
        isHistoryView={isHistoryView}
        historyConversations={historyConversations}
        onBackToActive={onBackToActive}
      />
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </>
  );
};

export default ConversationsList; 