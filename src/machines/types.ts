export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  source: string | null;
  timestamp: number;
}

export interface ChatStore {
  [conversationId: string]: Message[];
}

export interface ConversationUpdate {
  type: 'CHAT_UPDATED';
  conversationId: string;
  messages: Message[];
  lastMessage: Message;
  timestamp: string;
} 