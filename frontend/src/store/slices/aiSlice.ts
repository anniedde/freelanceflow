import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface AIConversation {
  id: string;
  messages: ChatMessage[];
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIJob {
  id: string;
  type: 'revenue-analysis' | 'task-optimization';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AIState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  isTyping: boolean;
  isLoading: boolean;
  jobs: AIJob[];
  activeTab: 'assist' | 'automation' | 'insights';
  error: string | null;
}

const initialState: AIState = {
  conversations: [],
  activeConversationId: null,
  isTyping: false,
  isLoading: false,
  jobs: [],
  activeTab: 'assist',
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Conversation management
    createConversation: (state, action: PayloadAction<{ id?: string; title?: string }>) => {
      const id = action.payload.id || `conv_${Date.now()}`;
      const conversation: AIConversation = {
        id,
        messages: [],
        title: action.payload.title || 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.conversations.unshift(conversation);
      state.activeConversationId = id;
    },

    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
    },

    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Omit<ChatMessage, 'id' | 'timestamp'> }>) => {
      const { conversationId, message } = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);

      if (conversation) {
        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toISOString(),
          ...message,
        };
        conversation.messages.push(newMessage);
        conversation.updatedAt = new Date().toISOString();
      }
    },

    updateStreamingMessage: (state, action: PayloadAction<{ conversationId: string; token: string }>) => {
      const { conversationId, token } = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);

      if (conversation) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          lastMessage.content += token;
        }
      }
    },

    finalizeStreamingMessage: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);

      if (conversation) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        if (lastMessage && lastMessage.isStreaming) {
          lastMessage.isStreaming = false;
        }
        conversation.updatedAt = new Date().toISOString();
      }
    },

    // UI state
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },

    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setActiveTab: (state, action: PayloadAction<'assist' | 'automation' | 'insights'>) => {
      state.activeTab = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Job management
    addJob: (state, action: PayloadAction<AIJob>) => {
      state.jobs.unshift(action.payload);
    },

    updateJob: (state, action: PayloadAction<{ jobId: string; updates: Partial<AIJob> }>) => {
      const { jobId, updates } = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      if (job) {
        Object.assign(job, updates);
      }
    },

    removeJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(j => j.id !== action.payload);
    },

    setJobs: (state, action: PayloadAction<AIJob[]>) => {
      state.jobs = action.payload;
    },

    // Clear conversations (for logout, etc.)
    clearConversations: (state) => {
      state.conversations = [];
      state.activeConversationId = null;
    },

    // Clear all state
    clearAIState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  createConversation,
  setActiveConversation,
  addMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  setIsTyping,
  setIsLoading,
  setActiveTab,
  setError,
  addJob,
  updateJob,
  removeJob,
  setJobs,
  clearConversations,
  clearAIState,
} = aiSlice.actions;

export default aiSlice.reducer;
