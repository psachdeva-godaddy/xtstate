import React, { useState, FormEvent } from 'react';
import { Message } from '../machines/types';
import { Conversation, HistoryConversation } from '../machines/conversationsMachine';
import './ConversationsList.css';

interface ChatHistoryProps {
  conversation: Conversation | HistoryConversation;
  chatHistory: Message[];
  onBack: () => void;
  onSendMessage?: (message: string) => void;
  isHistoryView: boolean;
  isProcessing: boolean;
  error: Error | null;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  conversation, 
  chatHistory, 
  onBack, 
  onSendMessage,
  isHistoryView,
  isProcessing,
  error 
}) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const getCustomerName = (conv: Conversation | HistoryConversation) => {
    if ('customerName' in conv) {
      return conv.customerName;
    }
    // For history conversations, we might want to extract the name from somewhere else
    // or use a placeholder
    return 'Customer';
  };

  const getCustomerId = (conv: Conversation | HistoryConversation) => {
    if ('customerId' in conv) {
      return conv.customerId;
    }
    // For history conversations, we might want to use the id field
    return conv.id;
  };

  return (
    <div className="chat-history-container">
      <div className="chat-header">
        <button onClick={onBack} className="back-button">
          Back to List
        </button>
        <div className="chat-customer-info">
          <h2>{getCustomerName(conversation)}</h2>
          <div className="chat-customer-details">
            <span>ID: {getCustomerId(conversation)}</span>
            <span>Status: {'state' in conversation ? conversation.state : conversation.status}</span>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {chatHistory.map((chat) => (
          <div 
            key={chat.id} 
            className={`chat-message ${chat.sender === 'user' ? 'customer' : 'agent'}`}
          >
            <div className="message-content">
              <p>{chat.content}</p>
              <span className="message-time">
                {new Date(chat.timestamp).toLocaleTimeString()}
              </span>
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