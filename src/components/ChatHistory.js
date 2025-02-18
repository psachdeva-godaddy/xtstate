import React, { useState } from 'react';
import './ConversationsList.css';

const ChatHistory = ({ conversation, chatHistory, onBack, onSendMessage }) => {
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
              <p>{chat.message}</p>
              <span className="message-time">{chat.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatHistory; 