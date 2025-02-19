export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  source: string | null;
  timestamp: number;
} 