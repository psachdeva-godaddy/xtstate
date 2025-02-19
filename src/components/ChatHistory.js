import React, { useState } from 'react';
import './ConversationsList.css';

const ChatHistory = ({ 
  conversation, 
  chatHistory, 
  onBack, 
  onSendMessage,
  isHistoryView,
  isProcessing,
  error 
}) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="chat-history-container">
      <div className="chat-header">
        <button onClick={onBack} className="back-button">
          Back to List
        </button>
        <div className="chat-customer-info">
          <h2>{conversation.customerName}</h2>
          <div className="chat-customer-details">
            <span>ID: {conversation.customerId}</span>
            <span>Status: {conversation.state}</span>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {chatHistory.map((chat) => (
          <div 
            key={chat.id} 
            className={`chat-message ${chat.sender === 'customer' ? 'customer' : 'agent'}`}
          >
            <div className="message-content">
              <p>{chat.content || chat.message}</p>
              <span className="message-time">{chat.timestamp}</span>
              {chat.source && (
                <div className="message-source">
                  Source: <a href={chat.source} target="_blank" rel="noopener noreferrer">{chat.source}</a>
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="chat-message agent processing">
            <div className="message-content">
              <p>Processing...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-message error">
            <div className="message-content">
              <p>Error: {error.message || 'Something went wrong'}</p>
            </div>
          </div>
        )}
      </div>

      {!isHistoryView && (
        <form onSubmit={handleSend} className="chat-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="message-input"
            disabled={isProcessing}
          />
          <button type="submit" className="send-button" disabled={isProcessing || !newMessage.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatHistory; 