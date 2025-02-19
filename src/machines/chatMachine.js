import { setup, assign, fromPromise } from 'xstate';
import { chatStorage } from '../services/chatStorage';

const GRAPHQL_ENDPOINT = '/graphql';

const sendGraphQLMessage = async (message) => {
  const mutation = {
    query: `
      mutation {
        sendMessage(postMessageRequest: {
          sessionId: "guide-assist-visitor:8511ddaa-d324-4fc7-9004-0c71978411a6",
          message: "${message}",
          platform: "Guide-Page",
          guide: {
            displayName: "Ayush Garg",
            userName: "agarg3",
            location: "us",
            costCenter: "us"
          },
          context: {
            market: "en-US",
            visitorId: ":8511ddaa-d324-4fc7-9004-0c71978411a6",
            visitId: ":8511ddaa-d324-4fc7-9004-0c71978411a6",
            trafficType: "visitor",
            visitor: ":8511ddaa-d324-4fc7-9004-0c71978411a6",
            shopper: null,
            source: "guide-assist",
            metadata: {
              harnessed: false,
              contactId: ":8511ddaa-d324-4fc7-9004-0c71978411a6",
              source: "guide-assist"
            }
          },
          bypassLLM: false
        }) {
          messages {
            type
            text
            by
          }
          state
          commands {
            type
            payload
            by
          }
          metadata
        }
      }
    `
  };

  try {
    console.log('Sending request to:', GRAPHQL_ENDPOINT);
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(mutation)
    });

    if (!response.ok) {
      console.error('Response not OK:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers])
      });
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    const assistantMessage = data.data.sendMessage.messages.find(msg => msg.by === 'assistant');
    
    return {
      text: assistantMessage?.text || 'No response from assistant',
      source: null
    };
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw new Error(`Failed to fetch response: ${error.message}`);
  }
};

const createMessage = (content, sender, source = null) => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  content,
  sender,
  source,
  timestamp: new Date().toISOString()
});

export const chatMachine = setup({
  actors: {
    fetchResponse: fromPromise(async ({ input }) => {
      const response = await sendGraphQLMessage(input.message);
      return response;
    }),
    loadStoredMessages: fromPromise(async ({ input }) => {
      const messages = chatStorage.getChat(input.conversationId);
      return { messages };
    })
  },
  actions: {
    notifyConversationUpdate: ({ context, event }) => {
      if (context.onConversationUpdate) {
        context.onConversationUpdate({
          type: 'CHAT_UPDATED',
          conversationId: context.conversationId,
          messages: context.messages,
          lastMessage: context.messages[context.messages.length - 1],
          timestamp: new Date().toISOString()
        });
      }
    },
    persistMessages: ({ context }) => {
      if (context.conversationId && context.messages.length > 0) {
        chatStorage.updateChat(context.conversationId, context.messages);
      }
    },
    clearMessages: assign({
      messages: [],
      currentInput: '',
      error: null,
      isProcessing: false
    })
  }
}).createMachine({
  id: 'chat',
  initial: 'idle',
  context: {
    messages: [],
    currentInput: '',
    error: null,
    isProcessing: false,
    conversationId: null,
    onConversationUpdate: null
  },
  states: {
    idle: {
      on: {
        CONVERSATION_SELECTED: {
          target: 'loading_messages',
          actions: ['clearMessages'] // Clear messages before loading new conversation
        }
      }
    },
    loading_messages: {
      entry: assign({
        conversationId: ({ event }) => event.conversationId,
        messages: [] // Clear messages on entry
      }),
      invoke: {
        src: 'loadStoredMessages',
        input: ({ context, event }) => ({
          conversationId: event.conversationId
        }),
        onDone: {
          target: 'awaiting_input',
          actions: [
            assign({
              messages: ({ event }) => event.output.messages || [],
              error: null,
              currentInput: '',
              isProcessing: false
            }),
            'notifyConversationUpdate'
          ]
        },
        onError: {
          target: 'awaiting_input',
          actions: assign({
            error: ({ event }) => event.error,
            messages: []
          })
        }
      }
    },
    awaiting_input: {
      on: {
        RECEIVED_INPUT: {
          target: 'awaiting_response',
          actions: [
            assign({
              currentInput: ({ event }) => event.message,
              messages: ({ context, event }) => [
                ...context.messages,
                createMessage(event.message, 'user')
              ],
              isProcessing: true
            }),
            'notifyConversationUpdate',
            'persistMessages'
          ]
        },
        CONVERSATION_SELECTED: {
          target: 'loading_messages',
          actions: [
            'persistMessages',
            'clearMessages'
          ]
        }
      }
    },
    awaiting_response: {
      invoke: {
        src: 'fetchResponse',
        input: ({ context }) => ({
          message: context.currentInput,
          conversationId: context.conversationId
        }),
        onDone: {
          target: 'awaiting_input',
          actions: [
            assign({
              messages: ({ context, event }) => [
                ...context.messages,
                createMessage(event.output.text, 'assistant', event.output.source)
              ],
              isProcessing: false
            }),
            'notifyConversationUpdate',
            'persistMessages'
          ]
        },
        onError: {
          target: 'awaiting_input',
          actions: [
            assign({
              error: ({ event }) => event.error,
              isProcessing: false
            }),
            'notifyConversationUpdate'
          ]
        }
      },
      on: {
        CONVERSATION_SELECTED: {
          target: 'loading_messages',
          actions: [
            'persistMessages',
            'clearMessages'
          ]
        }
      }
    }
  }
});

export const chatEvents = {
  sendMessage: (message) => ({
    type: 'RECEIVED_INPUT',
    message
  }),
  endStreaming: () => ({
    type: 'END_STREAMING'
  }),
  selectConversation: (conversationId, messages = []) => ({
    type: 'CONVERSATION_SELECTED',
    conversationId,
    messages: messages.map(msg => ({
      ...msg,
      content: msg.content || msg.message,
      message: undefined
    }))
  })
};