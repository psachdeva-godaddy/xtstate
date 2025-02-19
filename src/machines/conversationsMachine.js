import { spawnChild, assign, setup, fromPromise } from 'xstate';
import { chatStorage } from '../services/chatStorage';

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
  ]
};

// Helper to get chat history for a customer
const getCustomerHistory = (customerId) => {
  const allChats = chatStorage.getAllChats();
  const customerChats = Object.entries(allChats)
    .filter(([conversationId, messages]) => {
      // Find the conversation in mock data that matches this ID
      const conversation = mockData.active.find(conv => conv.ucid === conversationId);
      return conversation && conversation.customerId === customerId;
    })
    .map(([conversationId, messages]) => ({
      id: conversationId,
      date: messages[0]?.timestamp || new Date().toISOString(),
      messages,
      status: 'Completed'
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return customerChats;
};

export const conversationsMachine = setup({
  actors: {
    fetchActiveConversations: fromPromise(async () => {
      console.log('Starting to fetch active conversations...');
      const result = { conversations: mockData.active };
      console.log('Fetched active conversations:', result);
      return result;
    }),
    fetchHistoryConversations: fromPromise(async ({ input }) => {
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
              conv => conv.ucid === context.selectedConversation.ucid
            );
            return updated || context.selectedConversation;
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
            error: ({ event }) => event.error
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
                  selectedConversation: ({ event }) => event.conversation,
                  selectedChatHistory: ({ event }) => {
                    const storedMessages = chatStorage.getChat(event.conversation.ucid);
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
              customerId: context.selectedCustomerId
            }),
            onDone: {
              actions: assign({
                historyConversations: ({ event }) => event.output.conversations
              })
            },
            onError: {
              actions: assign({
                error: ({ event }) => event.error,
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
                  selectedHistoryChat: ({ event }) => event.conversation,
                  selectedChatHistory: ({ event }) => event.conversation.messages || [],
                  selectedConversation: ({ event }) => event.conversation
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
                  selectedConversation: ({ event }) => event.conversation,
                  selectedChatHistory: ({ event }) => {
                    const storedMessages = chatStorage.getChat(event.conversation.ucid);
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
      },
      on: {
        REFRESH: {
          target: 'initializing',
          actions: assign({
            activeConversations: [],
            historyConversations: [],
            error: null
          })
        },
        NEW_CONTACT: {
          actions: assign({
            activeConversations: ({ context }) => [
              {
                ucid: `new-${Date.now()}`,
                state: 'NEW',
                customerName: 'New Customer',
                customerId: `new-${Date.now()}`,
                opened: new Date().toLocaleTimeString(),
                updated: new Date().toLocaleTimeString()
              },
              ...context.activeConversations
            ]
          })
        },
        CHANGE_STATUS: {
          actions: [
            assign({
              activeConversations: ({ context, event }) => {
                if (event.status === 'CLOSED' || event.status === 'COMPLETED') {
                  return context.activeConversations.filter(conv => conv.ucid !== event.ucid);
                }
                return context.activeConversations.map(conv => 
                  conv.ucid === event.ucid 
                    ? { ...conv, state: event.status, updated: new Date().toLocaleTimeString() }
                    : conv
                );
              }
            }),
            ({ context, event }) => console.log(`Status changed to ${event.status} for conversation ${event.ucid}`)
          ]
        }
      }
    }
  }
});