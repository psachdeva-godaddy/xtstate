import { setup, assign, fromPromise } from 'xstate';
import { chatStorage } from '../services/chatStorage';
import { Message } from './types';

const GRAPHQL_ENDPOINT = '/graphql';

interface ChatContext {
  messages: Message[];
  currentInput: string;
  error: Error | null;
  isProcessing: boolean;
  conversationId: string | null;
  onConversationUpdate: ((update: ConversationUpdate) => void) | null;
}

interface ConversationUpdate {
  type: 'CHAT_UPDATED';
  conversationId: string;
  messages: Message[];
  lastMessage: Message;
  timestamp: string;
}

interface GraphQLResponse {
  data: {
    sendMessage: {
      messages: Array<{
        type: string;
        text: string;
        by: string;
      }>;
      state: string;
      commands: Array<{
        type: string;
        payload: any;
        by: string;
      }>;
      metadata: any;
    };
  };
}

type ChatEvent =
  | { type: 'CONVERSATION_SELECTED'; conversationId: string }
  | { type: 'RECEIVED_INPUT'; message: string };

const sendGraphQLMessage = async (message: string): Promise<{ text: string; source: null }> => {
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
        headers: Array.from(response.headers.entries())
      });
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
    }

    const data: GraphQLResponse = await response.json();
    console.log('Response data:', data);
    const assistantMessage = data.data.sendMessage.messages.find(msg => msg.by === 'assistant');
    
    return {
      text: assistantMessage?.text || 'No response from assistant',
      source: null
    };
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw new Error(`Failed to fetch response: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const createMessage = (content: string, sender: 'user' | 'assistant', source: string | null = null): Message => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  content,
  sender,
  source,
  timestamp: Date.now()
});

export const chatMachine = setup({
  types: {
    context: {} as ChatContext,
    events: {} as ChatEvent,
  },
  actors: {
    fetchResponse: fromPromise(async ({ input }: { input: { message: string } }) => {
      const response = await sendGraphQLMessage(input.message);
      return response;
    }),
    loadStoredMessages: fromPromise(async ({ input }: { input: { conversationId: string } }) => {
      const messages = chatStorage.getChat(input.conversationId);
      return { messages };
    })
  },
  actions: {
    notifyConversationUpdate: ({ context }) => {
      if (context.onConversationUpdate && context.conversationId) {
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
          actions: ['clearMessages']
        }
      }
    },
    loading_messages: {
      entry: assign({
        conversationId: ({ event }) => 
          'conversationId' in event ? event.conversationId : null,
        messages: []
      }),
      invoke: {
        src: 'loadStoredMessages',
        input: ({ event }) => ({
          conversationId: 'conversationId' in event ? event.conversationId : ''
        }),
        onDone: {
          target: 'awaiting_input',
          actions: [
            assign({
              messages: ({ event }) => (event.output.messages || []) as Message[],
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
            error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error'),
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
              error: ({ event }) => event.error instanceof Error ? event.error : new Error('Unknown error'),
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