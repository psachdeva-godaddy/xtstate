import { setup, assign, fromPromise } from 'xstate';

export interface CardData {
  id: string;
  title: string;
  value: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

interface StaticCardsContext {
  cards: CardData[];
  shopperId: string | null;
  error: Error | null;
  isLoading: boolean;
}

type StaticCardsEvent =
  | { type: 'SELECT_SHOPPER'; shopperId: string }
  | { type: 'CLEAR_CARDS' };

// Mock API function - will be replaced with real API call
const fetchShopperCards = async (shopperId: string): Promise<CardData[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock different data for different shopper IDs
  const mockCards: Record<string, CardData[]> = {
    "123456": [
      { 
        id: "1", 
        title: "Customer Details", 
        value: "United States | Since 2018 | Promoter 65", 
        type: "info" 
      },
      { 
        id: "2", 
        title: "Contact", 
        value: "john.doe@example.com | +1 (555) 123-4567", 
        type: "info" 
      }
    ],
    "789012": [
      { 
        id: "1", 
        title: "Customer Details", 
        value: "Canada | Since 2020 | Promoter 72", 
        type: "info" 
      },
      { 
        id: "2", 
        title: "Contact", 
        value: "pranav.s@example.com | +1 (555) 987-6543", 
        type: "info" 
      }
    ]
  };

  // Return mock data or default empty array
  return mockCards[shopperId] || [];
};

export const staticCardsMachine = setup({
  types: {
    context: {} as StaticCardsContext,
    events: {} as StaticCardsEvent,
  },
  actors: {
    fetchCards: fromPromise(async ({ input }: { input: { shopperId: string } }) => {
      const cards = await fetchShopperCards(input.shopperId);
      return { cards };
    }),
  }
}).createMachine({
  id: 'staticCards',
  initial: 'idle',
  context: {
    cards: [],
    shopperId: null,
    error: null,
    isLoading: false
  },
  states: {
    idle: {
      on: {
        SELECT_SHOPPER: {
          target: 'loading',
          actions: assign({
            shopperId: ({ event }) => event.shopperId,
            isLoading: true
          })
        }
      }
    },
    loading: {
      invoke: {
        src: 'fetchCards',
        input: ({ context }) => ({
          shopperId: context.shopperId || ''
        }),
        onDone: {
          target: 'displaying',
          actions: assign({
            cards: ({ event }) => event.output.cards,
            error: null,
            isLoading: false
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error as Error,
            isLoading: false
          })
        }
      }
    },
    displaying: {
      on: {
        SELECT_SHOPPER: {
          target: 'loading',
          actions: assign({
            shopperId: ({ event }) => event.shopperId,
            isLoading: true
          })
        },
        CLEAR_CARDS: {
          target: 'idle',
          actions: assign({
            cards: [],
            shopperId: null,
            error: null
          })
        }
      }
    },
    error: {
      on: {
        SELECT_SHOPPER: {
          target: 'loading',
          actions: assign({
            shopperId: ({ event }) => event.shopperId,
            isLoading: true
          })
        }
      }
    }
  }
}); 