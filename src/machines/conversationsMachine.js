import { spawnChild, assign, setup, fromPromise } from 'xstate';

const mockData = {
  active: [
    {
      ucid: "123e4567-56-426614174000",
      state: "IN_PROGRESS",
      customerName: "John Doe",
      customerId: "1234",
      opened: "10:30",
      updated: "11:45",
      currentChat: {
        messages: [
          {
            id: "chat1",
            message: "I need help with my recent order #789",
            timestamp: "10:30",
            sender: "customer"
          },
          {
            id: "chat2",
            message: "I'll be happy to help you with that. Let me check the order details.",
            timestamp: "10:32",
            sender: "agent"
          },
          {
            id: "chat3",
            message: "The order shows it's currently in transit. Expected delivery is tomorrow.",
            timestamp: "10:33",
            sender: "agent"
          },
          {
            id: "chat4",
            message: "That's great, thank you! Can you also confirm if it requires a signature?",
            timestamp: "10:34",
            sender: "customer"
          },
          {
            id: "chat5",
            message: "Yes, it does require a signature for delivery.",
            timestamp: "10:35",
            sender: "agent"
          }
        ]
      },
      chatHistory: [
        {
          id: "hist-1",
          date: "2024-01-20",
          messages: [
            {
              id: "hist1-1",
              message: "I need to return an item from order #456",
              timestamp: "Jan 20, 09:30",
              sender: "customer"
            },
            {
              id: "hist1-2",
              message: "I can help you with the return process. Which item would you like to return?",
              timestamp: "Jan 20, 09:32",
              sender: "agent"
            },
            {
              id: "hist1-3",
              message: "The blue shirt, it doesn't fit",
              timestamp: "Jan 20, 09:33",
              sender: "customer"
            },
            {
              id: "hist1-4",
              message: "I've initiated the return. You'll receive a return label via email",
              timestamp: "Jan 20, 09:35",
              sender: "agent"
            }
          ]
        },
        {
          id: "hist-2",
          date: "2024-01-15",
          messages: [
            {
              id: "hist2-1",
              message: "Where can I find my invoice for order #123?",
              timestamp: "Jan 15, 14:20",
              sender: "customer"
            },
            {
              id: "hist2-2",
              message: "You can find all invoices in your account under 'Order History'",
              timestamp: "Jan 15, 14:22",
              sender: "agent"
            },
            {
              id: "hist2-3",
              message: "Found it, thank you!",
              timestamp: "Jan 15, 14:23",
              sender: "customer"
            }
          ]
        }
      ]
    },
    {
      ucid: "123e4567-56-426614171000",
      state: "IN_PROGRESS",
      customerName: "Pranav Sachdeva",
      customerId: "1235",
      opened: "11:30",
      updated: "11:45",
      currentChat: {
        messages: [
          {
            id: "chat1",
            message: "Hi, I'm having trouble accessing my premium features",
            timestamp: "11:30",
            sender: "customer"
          },
          {
            id: "chat2",
            message: "I'll help you with that. Can you tell me when you last had access?",
            timestamp: "11:31",
            sender: "agent"
          },
          {
            id: "chat3",
            message: "It was working fine yesterday, but today I'm locked out",
            timestamp: "11:32",
            sender: "customer"
          }
        ]
      },
      chatHistory: [
        {
          id: "hist-3",
          date: "2024-01-18",
          messages: [
            {
              id: "hist3-1",
              message: "How do I upgrade my subscription?",
              timestamp: "Jan 18, 15:20",
              sender: "customer"
            },
            {
              id: "hist3-2",
              message: "I'll guide you through the upgrade process. Which plan are you interested in?",
              timestamp: "Jan 18, 15:22",
              sender: "agent"
            },
            {
              id: "hist3-3",
              message: "The premium plan",
              timestamp: "Jan 18, 15:23",
              sender: "customer"
            },
            {
              id: "hist3-4",
              message: "Great choice! I've sent you the upgrade link via email",
              timestamp: "Jan 18, 15:25",
              sender: "agent"
            }
          ]
        }
      ]
    }
  ]
};

export const conversationsMachine = setup({
  actors: {
    fetchActiveConversations: fromPromise(async () => {
      console.log('Starting to fetch active conversations...');
      const result = { conversations: mockData.active };
      console.log('Fetched active conversations:', result);
      return result;
    }),
    fetchHistoryConversations: fromPromise(async () => {
      console.log('Starting to fetch history conversations...');
      const result = { conversations: mockData.history };
      console.log('Fetched history conversations:', result);
      return result;
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
    selectedHistoryChat: null
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
          target: 'loadingHistory'
        },
        onError: {
          actions: assign({
            error: ({ event }) => event.error
          })
        }
      }
    },
    loadingHistory: {
      invoke: {
        src: 'fetchHistoryConversations',
        onDone: {
          actions: [
            assign({
              historyConversations: ({ event }) => event.output.conversations
            }),
            ({ context }) => console.log('History conversations loaded:', context.historyConversations)
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
              selectedChatHistory: []
            }),
            ({ context }) => console.log('Entering active state with conversations:', context.activeConversations)
          ],
          on: {
            VIEW_CHAT_HISTORY: {
              target: 'viewingChatHistory',
              actions: assign({
                selectedConversation: ({ event }) => event.conversation,
                selectedChatHistory: ({ event }) => event.conversation.currentChat.messages || []
              })
            },
            CONTACT_HISTORY_CLICK: {
              target: 'history',
              actions: [
                assign({ 
                  view: 'history',
                  selectedCustomerId: ({ event }) => event.customerId,
                  historyConversations: ({ context, event }) => {
                    const conversation = context.activeConversations.find(
                      conv => conv.customerId === event.customerId
                    );
                    return conversation ? conversation.chatHistory : [];
                  },
                  selectedConversation: null,
                  selectedChatHistory: []
                })
              ]
            }
          }
        },
        history: {
          entry: [
            assign({ 
              view: 'history',
              selectedHistoryChat: null,
              selectedChatHistory: []
            }),
            ({ context }) => console.log('Entering history state with conversations:', context.historyConversations)
          ],
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
              actions: assign({
                selectedHistoryChat: ({ event }) => event.conversation,
                selectedChatHistory: ({ event }) => event.conversation.messages || []
              })
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
            CONTACT_HISTORY_CLICK: {
              target: 'history',
              actions: [
                assign({ 
                  view: 'history',
                  selectedCustomerId: ({ event }) => event.customerId,
                  historyConversations: ({ context, event }) => {
                    const conversation = context.activeConversations.find(
                      conv => conv.customerId === event.customerId
                    );
                    return conversation ? conversation.chatHistory : [];
                  },
                  selectedConversation: null,
                  selectedChatHistory: []
                })
              ]
            },
            ADD_CHAT_MESSAGE: {
              actions: [
                assign({
                  selectedChatHistory: ({ context, event }) => [
                    ...context.selectedChatHistory,
                    {
                      id: `chat${Date.now()}`,
                      message: event.message,
                      timestamp: new Date().toLocaleTimeString(),
                      sender: event.sender
                    }
                  ],
                  activeConversations: ({ context, event }) =>
                    context.activeConversations.map(conv =>
                      conv.ucid === context.selectedConversation.ucid
                        ? {
                            ...conv,
                            currentChat: {
                              ...conv.currentChat,
                              messages: [
                                ...conv.currentChat.messages,
                                {
                                  id: `chat${Date.now()}`,
                                  message: event.message,
                                  timestamp: new Date().toLocaleTimeString(),
                                  sender: event.sender
                                }
                              ]
                            },
                            updated: new Date().toLocaleTimeString()
                          }
                        : conv
                    )
                })
              ]
            }
          }
        }
      },
      on: {
        TOGGLE_VIEW: {
          actions: assign({
            view: ({ context }) => (context.view === 'active' ? 'history' : 'active')
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
        CONTACT_UPDATED: {
          actions: assign({
            activeConversations: ({ context, event }) => 
              context.activeConversations.map(conv => 
                conv.ucid === event.ucid 
                  ? { ...conv, updated: new Date().toLocaleTimeString() }
                  : conv
              )
          })
        },
        CONTACT_REMOVED: {
          actions: [
            assign({
              activeConversations: ({ context, event }) =>
                context.activeConversations.filter(conv => conv.ucid !== event.ucid),
              historyConversations: ({ context, event }) => [
                {
                  ...context.activeConversations.find(conv => conv.ucid === event.ucid),
                  state: 'CLOSED',
                  date: new Date().toLocaleDateString(),
                  status: 'Closed'
                },
                ...context.historyConversations
              ]
            }),
            ({ context }) => console.log('After contact removed, history:', context.historyConversations)
          ]
        },
        REFRESH: {
          target: 'initializing',
          actions: assign({
            activeConversations: [],
            historyConversations: [],
            error: null
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
              },
              historyConversations: ({ context, event }) => {
                if (event.status === 'CLOSED' || event.status === 'COMPLETED') {
                  const conversation = context.activeConversations.find(conv => conv.ucid === event.ucid);
                  return [
                    {
                      ...conversation,
                      state: event.status,
                      date: new Date().toLocaleDateString(),
                      status: event.status === 'CLOSED' ? 'Closed' : 'Resolved'
                    },
                    ...context.historyConversations
                  ];
                }
                return context.historyConversations;
              }
            }),
            ({ context, event }) => console.log(`Status changed to ${event.status} for conversation ${event.ucid}`)
          ]
        }
      }
    }
  }
});