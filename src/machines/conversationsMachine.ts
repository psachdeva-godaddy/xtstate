import { spawnChild, assign, setup, fromPromise } from 'xstate';
import { chatStorage } from '../services/chatStorage';
import { Message } from './types';

export interface Conversation {
  ucid: string;
  state: string;
  customerName: string;
  customerId: string;
  opened: string;
  updated: string;
}

export interface HistoryConversation {
  id: string;
  date: string;
  messages: Message[];
  status: string;
}

interface ConversationsContext {
  activeConversations: Conversation[];
  historyConversations: HistoryConversation[];
  error: Error | null;
  view: 'active' | 'history';
  selectedConversation: Conversation | null;
  selectedChatHistory: Message[];
  selectedCustomerId: string | null;
  selectedHistoryChat: HistoryConversation | null;
  conversationMessages: Record<string, Message[]>;
}

type ConversationsEvent =
  | { type: 'UPDATE_ACTIVE_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'UPDATE_CONVERSATION_MESSAGES'; conversationId: string; messages: Message[] }
  | { type: 'VIEW_CHAT_HISTORY'; conversation: Conversation | HistoryConversation }
  | { type: 'CONTACT_HISTORY_CLICK'; customerId: string }
  | { type: 'CONTACT_HISTORY_BACK_CLICK' }
  | { type: 'BACK_TO_LIST' };

// Simplified mock data - only conversation card details
const mockData = {
  active: [
    {
      ucid: "123e4567-56-426614174000",
      state: "IN_PROGRESS",
      customerName: "John Doe",
      customerId: "1234",
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    },
    {
      ucid: "123e4567-56-426614171000",
      state: "IN_PROGRESS",
      customerName: "Pranav Sachdeva",
      customerId: "1235",
      opened: new Date().toLocaleTimeString(),
      updated: new Date().toLocaleTimeString()
    }
  ] as Conversation[]
};

// Helper to get chat history for a customer
const getCustomerHistory = (customerId: string): HistoryConversation[] => {
  const allChats = chatStorage.getAllChats();
  const customerChats = Object.entries(allChats)
    .filter(([conversationId, messages]) => {
      // Find the conversation in mock data that matches this ID
      const conversation = mockData.active.find(conv => conv.ucid === conversationId);
      return conversation && conversation.customerId === customerId;
    })
    .map(([conversationId, messages]) => ({
      id: conversationId,
      date: (messages as Message[])[0]?.timestamp.toString() || new Date().toISOString(),
      messages: messages as Message[],
      status: 'Completed'
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return customerChats;
};

export const conversationsMachine = setup({
  types: {
    context: {} as ConversationsContext,
    events: {} as ConversationsEvent,
  },
  actors: {
    fetchActiveConversations: fromPromise(async () => {
      console.log('Starting to fetch active conversations...');
      const result = { conversations: mockData.active };
      console.log('Fetched active conversations:', result);
      return result;
    }),
    fetchHistoryConversations: fromPromise(async ({ input }: { input: { customerId: string } }) => {
      console.log('Fetching history for customer:', input.customerId);
      const history = getCustomerHistory(input.customerId);
      console.log('Fetched history:', history);
      return { conversations: history };
    })
  }
}).createMachine({
  id: 'conversations',
  initial: 'initializing',
  context: {
    activeConversations: [],
    historyConversations: [],
    error: null,
    view: 'active',
    selectedConversation: null,
    selectedChatHistory: [],
    selectedCustomerId: null,
    selectedHistoryChat: null,
    conversationMessages: {}
  },
  on: {
    UPDATE_ACTIVE_CONVERSATIONS: {
      actions: [
        assign({
          activeConversations: ({ event }) => event.conversations,
          selectedConversation: ({ context, event }) => {
            if (!context.selectedConversation) return null;
            const updated = event.conversations.find(
              conv => conv.ucid === context.selectedConversation?.ucid
            );
            return updated || null;
          }
        }),
        ({ context }) => console.log('Updated active conversations:', context.activeConversations)
      ]
    },
    UPDATE_CONVERSATION_MESSAGES: {
      actions: [
        assign({
          conversationMessages: ({ context, event }) => ({
            ...context.conversationMessages,
            [event.conversationId]: event.messages
          }),
          activeConversations: ({ context, event }) => 
            context.activeConversations.map(conv => 
              conv.ucid === event.conversationId
                ? {
                    ...conv,
                    updated: new Date().toLocaleTimeString()
                  }
                : conv
            ),
          selectedConversation: ({ context, event }) => 
            context.selectedConversation?.ucid === event.conversationId
              ? {
                  ...context.selectedConversation,
                  updated: new Date().toLocaleTimeString()
                }
              : context.selectedConversation
        }),
        ({ context, event }) => console.log('Updated messages for conversation:', event.conversationId)
      ]
    }
  },
  states: {
    initializing: {
      entry: () => console.log('Entering initializing state'),
      invoke: {
        src: 'fetchActiveConversations',
        onDone: {
          actions: [
            assign({
              activeConversations: ({ event }) => event.output.conversations
            }),
            ({ context }) => console.log('Active conversations loaded:', context.activeConversations)
          ],
          target: 'displaying'
        },
        onError: {
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error')
          })
        }
      }
    },
    displaying: {
      initial: 'active',
      states: {
        active: {
          entry: [
            assign({ 
              view: 'active',
              selectedHistoryChat: null,
              selectedChatHistory: [],
              historyConversations: []
            }),
            ({ context }) => console.log('Entering active state with conversations:', context.activeConversations)
          ],
          on: {
            VIEW_CHAT_HISTORY: {
              target: 'viewingChatHistory',
              actions: [
                assign({
                  selectedConversation: ({ event }) => event.conversation as Conversation,
                  selectedChatHistory: ({ event }) => {
                    const storedMessages = chatStorage.getChat((event.conversation as Conversation).ucid) as Message[];
                    return storedMessages;
                  }
                }),
                ({ context }) => console.log('Selected conversation:', context.selectedConversation)
              ]
            },
            CONTACT_HISTORY_CLICK: {
              target: 'history',
              actions: assign({ 
                view: 'history',
                selectedCustomerId: ({ event }) => event.customerId
              })
            }
          }
        },
        history: {
          entry: assign({ 
            view: 'history',
            selectedHistoryChat: null,
            selectedChatHistory: []
          }),
          invoke: {
            src: 'fetchHistoryConversations',
            input: ({ context }) => ({
              customerId: context.selectedCustomerId || ''
            }),
            onDone: {
              actions: assign({
                historyConversations: ({ event }) => event.output.conversations
              })
            },
            onError: {
              actions: assign({
                error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error'),
                historyConversations: []
              })
            }
          },
          on: {
            CONTACT_HISTORY_BACK_CLICK: {
              target: 'active',
              actions: assign({
                selectedHistoryChat: null,
                selectedChatHistory: [],
                historyConversations: []
              })
            },
            VIEW_CHAT_HISTORY: {
              actions: [
                assign({
                  selectedHistoryChat: ({ event }) => event.conversation as HistoryConversation,
                  selectedChatHistory: ({ event }) => ((event.conversation as HistoryConversation).messages || []) as Message[],
                  selectedConversation: ({ event }) => event.conversation as Conversation
                }),
                ({ context }) => console.log('Selected history chat:', context.selectedHistoryChat)
              ]
            }
          }
        },
        viewingChatHistory: {
          on: {
            BACK_TO_LIST: {
              target: 'active',
              actions: assign({
                selectedConversation: null,
                selectedChatHistory: [],
                selectedHistoryChat: null
              })
            },
            VIEW_CHAT_HISTORY: {
              actions: [
                assign({
                  selectedConversation: ({ event }) => event.conversation as Conversation,
                  selectedChatHistory: ({ event }) => {
                    const storedMessages = chatStorage.getChat((event.conversation as Conversation).ucid) as Message[];
                    return storedMessages;
                  }
                }),
                ({ context }) => console.log('Switched to different chat:', context.selectedConversation)
              ]
            },
            CONTACT_HISTORY_CLICK: {
              target: 'history',
              actions: assign({ 
                view: 'history',
                selectedCustomerId: ({ event }) => event.customerId,
                selectedConversation: null,
                selectedChatHistory: [],
                selectedHistoryChat: null
              })
            }
          }
        }
      }
    }
  }
}); 