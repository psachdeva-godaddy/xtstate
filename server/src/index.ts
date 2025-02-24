import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { redisService } from './services/redis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test Redis endpoint
app.get('/api/test-redis', async (req, res) => {
  try {
    const result = await redisService.testRedis();
    res.json({ success: true, value: result });
  } catch (error) {
    console.error('Error testing Redis:', error);
    res.status(500).json({ error: 'Failed to test Redis' });
  }
});

// Get all chats
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await redisService.getAllChats();
    res.json(chats);
  } catch (error) {
    console.error('Error getting all chats:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// Get specific chat
app.get('/api/chats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const chat = await redisService.getChat(conversationId);
    res.json(chat);
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// Update chat
app.post('/api/chats/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messages } = req.body;
    const success = await redisService.updateChat(conversationId, messages);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update chat' });
    }
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Clear all chats
app.delete('/api/chats', async (req, res) => {
  try {
    const success = await redisService.clearAll();
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to clear chats' });
    }
  } catch (error) {
    console.error('Error clearing chats:', error);
    res.status(500).json({ error: 'Failed to clear chats' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 