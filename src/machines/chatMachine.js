import { setup, assign, fromPromise } from 'xstate';
import { chatStorage } from '../services/chatStorage';

// Mock API response function - we'll keep this for now
const mockApiResponse = async (message) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    text: `This is a mock response to: "${message}"`,
    source: 'https://api.example.com/docs'
  };
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
      const response = await mockApiResponse(input.message);
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
              messages: ({ event, event: { type, ...eventData } }) => {
                // If we have stored messages, use them
                if (event.output.messages.length > 0) {
                  return event.output.messages;
                }
                // Otherwise use the messages from the event
                return eventData.messages || [];
              },
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
            messages: ({ event }) => event.messages || []
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
            'persistMessages', // Save current messages before switching
            'clearMessages'  // Clear messages before loading new conversation
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
          target: 'streaming_response',
          actions: [
            assign({
              messages: ({ context, event }) => [
                ...context.messages,
                createMessage(event.output.text, 'assistant', event.output.source)
              ]
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
            'persistMessages', // Save current messages before switching
            'clearMessages'  // Clear messages before loading new conversation
          ]
        }
      }
    },
    streaming_response: {
      entry: assign({ isProcessing: true }),
      on: {
        END_STREAMING: {
          target: 'awaiting_input',
          actions: [
            assign({ isProcessing: false }),
            'notifyConversationUpdate',
            'persistMessages'
          ]
        },
        CONVERSATION_SELECTED: {
          target: 'loading_messages',
          actions: [
            'persistMessages', // Save current messages before switching
            'clearMessages'  // Clear messages before loading new conversation
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