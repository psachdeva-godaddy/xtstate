import { Message } from '../machines/types';

interface ChatStore {
  [conversationId: string]: Message[];
}

const CHAT_STORAGE_KEY = 'chat_messages_store';

export const chatStorage = {
  // Get all stored chats
  getAllChats: (): ChatStore => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading chat storage:', error);
      return {};
    }
  },

  // Get messages for a specific conversation
  getChat: (conversationId: string): Message[] => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      const chats: ChatStore = stored ? JSON.parse(stored) : {};
      return chats[conversationId] || [];
    } catch (error) {
      console.error('Error reading chat:', error);
      return [];
    }
  },

  // Update messages for a specific conversation
  updateChat: (conversationId: string, messages: Message[]): boolean => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      const chats: ChatStore = stored ? JSON.parse(stored) : {};
      chats[conversationId] = messages;
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
      return true;
    } catch (error) {
      console.error('Error updating chat:', error);
      return false;
    }
  },

  // Clear all stored chats
  clearAll: (): boolean => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing chats:', error);
      return false;
    }
  }
}; 