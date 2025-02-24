import { Message } from '../machines/types';

interface ChatStore {
  [conversationId: string]: Message[];
}

const API_BASE_URL = 'http://localhost:3001/api';

export const chatStorage = {
  // Get all stored chats
  getAllChats: async (): Promise<ChatStore> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error reading chat storage:', error);
      return {};
    }
  },

  // Get messages for a specific conversation
  getChat: async (conversationId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      return await response.json();
    } catch (error) {
      console.error('Error reading chat:', error);
      return [];
    }
  },

  // Update messages for a specific conversation
  updateChat: async (conversationId: string, messages: Message[]): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update chat');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating chat:', error);
      return false;
    }
  },

  // Clear all stored chats
  clearAll: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear chats');
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing chats:', error);
      return false;
    }
  }
}; 