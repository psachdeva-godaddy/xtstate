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
  customerName: string;
  customerId: string;
  timestamp: string;
  date: string;
  messages: Message[];
  status: string;
}

type ViewState = 'active' | 'history';

interface ConversationsContext {
  activeConversations: Conversation[];
  historyConversations: HistoryConversation[];
  selectedConversation: Conversation | null;
  selectedHistoryChat: HistoryConversation | null;
  selectedChatHistory: Message[];
  selectedCustomerId: string | null;
  view: ViewState;
  error: Error | null;
  conversationMessages: Record<string, Message[]>;
}

type ConversationsEvent =
  | { type: 'UPDATE_ACTIVE_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'UPDATE_CONVERSATION_MESSAGES'; conversationId: string; messages: Message[] }
  | { type: 'CONTACT_HISTORY_CLICK'; customerId: string }
  | { type: 'CONTACT_HISTORY_BACK_CLICK' }
  | { type: 'VIEW_CHAT_HISTORY'; conversation: Conversation | HistoryConversation }
  | { type: 'BACK_TO_LIST' };

const isViewChatHistoryEvent = (event: ConversationsEvent): event is { type: 'VIEW_CHAT_HISTORY'; conversation: Conversation | HistoryConversation } => {
  return event.type === 'VIEW_CHAT_HISTORY';
};

// Simplified mock data - only conversation card details
let mockData = {
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
const getCustomerHistory = async (customerId: string): Promise<HistoryConversation[]> => {
  const allChats = await chatStorage.getAllChats();
  
  // Get all conversations for this customer from the active conversations
  const customerConversations = mockData.active.filter(conv => conv.customerId === customerId);
  if (!customerConversations.length) return [];
  
  const customerChats = Object.entries(allChats)
    .filter(([conversationId, messages]) => {
      // Include chats that belong to any of this customer's conversations
      return customerConversations.some(conv => conv.ucid === conversationId);
    })
    .map(([conversationId, messages]) => {
      const conversation = customerConversations.find(conv => conv.ucid === conversationId) || customerConversations[0];
      return {
        id: conversationId,
        customerName: conversation.customerName,
        customerId: conversation.customerId,
        timestamp: new Date().toISOString(),
        date: (messages as Message[])[0]?.timestamp.toString() || new Date().toISOString(),
        messages: messages as Message[],
        status: conversation.state
      };
    })
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
      // Update mockData.active with any stored conversations
      const storedChats = await chatStorage.getAllChats();
      const updatedActive = mockData.active.map(conv => ({
        ...conv,
        updated: storedChats[conv.ucid] ? 
          new Date((storedChats[conv.ucid] as Message[])[0]?.timestamp || Date.now()).toLocaleTimeString() :
          conv.updated
      }));
      
      const result = { conversations: updatedActive };
      console.log('Fetched active conversations:', result);
      return result;
    }),
    fetchHistoryConversations: fromPromise(async ({ input }: { input: { customerId: string } }) => {
      console.log('Fetching history for customer:', input.customerId);
      const history = await getCustomerHistory(input.customerId);
      console.log('Fetched history:', history);
      return { conversations: history };
    }),
    loadChatHistory: fromPromise(async ({ input }: { input: { conversationId: string } }) => {
      const messages = await chatStorage.getChat(input.conversationId);
      return { messages };
    })
  }
}).createMachine({
  id: 'conversations',
  initial: 'initializing',
  context: {
    activeConversations: [],
    historyConversations: [],
    selectedConversation: null,
    selectedHistoryChat: null,
    selectedChatHistory: [],
    selectedCustomerId: null,
    view: 'active' as ViewState,
    error: null,
    conversationMessages: {}
  },
  states: {
    initializing: {
      entry: () => console.log('Entering initializing state'),
      invoke: {
        src: 'fetchActiveConversations',
        onDone: {
          actions: [
            assign({
              activeConversations: ({ event }) => {
                mockData.active = event.output.conversations;
                return event.output.conversations;
              }
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
              historyConversations: [],
              selectedCustomerId: null
            }),
            ({ context }) => console.log('Entering active state with conversations:', context.activeConversations)
          ],
          on: {
            VIEW_CHAT_HISTORY: {
              target: 'loading_chat_history',
              actions: assign({
                selectedConversation: ({ event }) => 
                  isViewChatHistoryEvent(event) && 'ucid' in event.conversation ? event.conversation : null,
                selectedHistoryChat: ({ event }) => 
                  isViewChatHistoryEvent(event) && !('ucid' in event.conversation) ? event.conversation : null
              })
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
        },
        loading_chat_history: {
          invoke: {
            src: 'loadChatHistory',
            input: ({ context }) => ({
              conversationId: (context.selectedConversation?.ucid || context.selectedHistoryChat?.id) || ''
            }),
            onDone: {
              target: 'viewingChatHistory',
              actions: [
                assign({
                  selectedChatHistory: ({ event }) => event.output?.messages || [],
                  conversationMessages: ({ context, event }) => ({
                    ...context.conversationMessages,
                    [(context.selectedConversation?.ucid || context.selectedHistoryChat?.id) || '']: event.output?.messages || []
                  })
                }),
                ({ context, event }) => console.log('Loaded chat history:', {
                  messages: event.output?.messages,
                  selectedConversation: context.selectedConversation,
                  selectedHistoryChat: context.selectedHistoryChat
                })
              ]
            },
            onError: {
              target: 'active',
              actions: [
                assign({
                  error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error'),
                  selectedChatHistory: [],
                  selectedHistoryChat: null,
                  selectedConversation: null,
                  view: 'active'
                }),
                ({ event }: { event: { error: unknown } }) => 
                  console.error('Error loading chat history:', event.error)
              ]
            }
          }
        },
        viewingChatHistory: {
          entry: ({ context }) => console.log('Viewing chat history:', {
            selectedConversation: context.selectedConversation,
            selectedHistoryChat: context.selectedHistoryChat,
            selectedChatHistory: context.selectedChatHistory,
            view: context.view
          }),
          on: {
            BACK_TO_LIST: [
              {
                guard: ({ context }) => context.view === 'history',
                target: 'history',
                actions: assign({
                  selectedConversation: null,
                  selectedChatHistory: [],
                  selectedHistoryChat: null
                })
              },
              {
                target: 'active',
                actions: assign({
                  selectedConversation: null,
                  selectedChatHistory: [],
                  selectedHistoryChat: null,
                  selectedCustomerId: null,
                  view: 'active',
                  historyConversations: []
                })
              }
            ],
            CONTACT_HISTORY_BACK_CLICK: {
              target: 'active',
              actions: assign({
                selectedHistoryChat: null,
                selectedChatHistory: [],
                historyConversations: [],
                selectedCustomerId: null,
                selectedConversation: null,
                view: 'active'
              })
            },
            VIEW_CHAT_HISTORY: {
              target: 'loading_chat_history',
              actions: assign({
                selectedConversation: ({ event }) => 
                  isViewChatHistoryEvent(event) && 'ucid' in event.conversation ? event.conversation : null,
                selectedHistoryChat: ({ event }) => 
                  isViewChatHistoryEvent(event) && !('ucid' in event.conversation) ? event.conversation : null
              })
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
            },
            UPDATE_CONVERSATION_MESSAGES: {
              actions: assign({
                selectedChatHistory: ({ event }) => event.messages,
                conversationMessages: ({ context, event }) => ({
                  ...context.conversationMessages,
                  [event.conversationId]: event.messages
                })
              })
            }
          }
        },
        history: {
          entry: assign({ 
            view: 'history',
            selectedHistoryChat: null,
            selectedChatHistory: [],
            selectedConversation: null
          }),
          invoke: {
            src: 'fetchHistoryConversations',
            input: ({ context }) => ({
              customerId: context.selectedCustomerId || ''
            }),
            onDone: {
              actions: [
                assign({
                  historyConversations: ({ event }) => event.output.conversations
                }),
                ({ context, event }) => console.log('Loaded history conversations:', event.output.conversations)
              ]
            },
            onError: {
              actions: [
                assign({
                  error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error'),
                  historyConversations: []
                }),
                ({ event }: { event: { error: unknown } }) => 
                  console.error('Error loading history conversations:', event.error)
              ]
            }
          },
          on: {
            CONTACT_HISTORY_BACK_CLICK: {
              target: 'active',
              actions: assign({
                selectedHistoryChat: null,
                selectedChatHistory: [],
                historyConversations: [],
                selectedCustomerId: null,
                selectedConversation: null,
                view: 'active'
              })
            },
            VIEW_CHAT_HISTORY: {
              target: 'loading_chat_history',
              actions: assign({
                selectedHistoryChat: ({ event }) => 
                  isViewChatHistoryEvent(event) && !('ucid' in event.conversation) ? event.conversation : null,
                selectedConversation: null,
                selectedChatHistory: []
              })
            }
          }
        }
      }
    }
  },
  on: {
    UPDATE_ACTIVE_CONVERSATIONS: {
      actions: [
        assign({
          activeConversations: ({ event }) => {
            mockData.active = event.conversations; // Update mockData when active conversations change
            return event.conversations;
          },
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
          selectedChatHistory: ({ event }) => event.messages,
          conversationMessages: ({ context, event }) => ({
            ...context.conversationMessages,
            [event.conversationId]: event.messages
          })
        }),
        ({ context, event }) => console.log('Updated messages for conversation:', event.conversationId)
      ]
    }
  }
}); 