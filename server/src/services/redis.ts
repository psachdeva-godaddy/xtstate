import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  port: 6379,
  tls: {
    
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully');
  // Test Redis connection by getting testKey ̰
  redis.get('testKey').then(value => {
    console.log('Test key value:', value);
  }).catch(error => {
    console.error('Error getting test key:', error);
  });
});

const CHAT_KEY_PREFIX = 'chat:';

export const redisService = {
  // Get all stored chats
  async getAllChats() {
    try {
      const keys = await redis.keys(`${CHAT_KEY_PREFIX}*`);
      const chats: Record<string, any> = {};
      
      for (const key of keys) {
        const conversationId = key.replace(CHAT_KEY_PREFIX, '');
        const messages = await redis.get(key);
        if (messages) {
          chats[conversationId] = JSON.parse(messages);
        }
      }
      
      return chats;
    } catch (error) {
      console.error('Error reading all chats from Redis:', error);
      return {};
    }
  },

  // Get messages for a specific conversation
  async getChat(conversationId: string) {
    try {
      const messages = await redis.get(`${CHAT_KEY_PREFIX}${conversationId}`);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error reading chat from Redis:', error);
      return [];
    }
  },

  // Update messages for a specific conversation
  async updateChat(conversationId: string, messages: any[]) {
    try {
      await redis.set(
        `${CHAT_KEY_PREFIX}${conversationId}`,
        JSON.stringify(messages)
      );
      return true;
    } catch (error) {
      console.error('Error updating chat in Redis:', error);
      return false;
    }
  },

  // Clear all stored chats
  async clearAll() {
    try {
      const keys = await redis.keys(`${CHAT_KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Error clearing chats from Redis:', error);
      return false;
    }
  },

  // Test function to get and set test key
  async testRedis() {
    try {
      // Set test key
      await redis.set('testKey', 'Hello from Redis!');
      console.log('Test key set successfully');

      // Get test key
      const value = await redis.get('testKey');
      console.log('Test key value:', value);
      return value;
    } catch (error) {
      console.error('Error in Redis test:', error);
      return null;
    }
  }
}; 