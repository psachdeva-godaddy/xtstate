import React from 'react';
import './ConversationsList.css';

const ConversationsHistory = ({ historyConversations, onBackClick, onViewChat }) => {
  console.log('Rendering history with conversations:', historyConversations);
  
  return (
    <div className="conversations-container">
      <div className="conversations-header">
        <h2>Previous Chats</h2>
        <button onClick={onBackClick}>
          Back to Active
        </button>
      </div>

      <div className="conversations-list">
        {Array.isArray(historyConversations) && historyConversations.length > 0 ? (
          historyConversations.map((chat) => (
            <div key={chat.id} className="conversation-card history-card">
              <div className="history-card-header">
                <div className="history-date">Date: {chat.date}</div>
              </div>
              
              <div className="history-preview">
                <div className="preview-title">Chat Preview:</div>
                {chat.messages && chat.messages.length > 0 && (
                  <div className="preview-messages">
                    {chat.messages.slice(0, 2).map(message => (
                      <div key={message.id} className={`preview-message ${message.sender}`}>
                        <span className="message-sender">{message.sender}:</span>
                        <span className="message-text">{message.message}</span>
                        <span className="message-time">{message.timestamp}</span>
                      </div>
                    ))}
                    {chat.messages.length > 2 && (
                      <div className="preview-more">... {chat.messages.length - 2} more messages</div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => onViewChat(chat)}
                className="view-chat-button"
              >
                View Full Chat
              </button>
            </div>
          ))
        ) : (
          <div className="no-data">
            No previous chats found for this customer.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsHistory; 