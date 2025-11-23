import api from './api';
import socketService from './socket';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AISmartReplyRequest {
  context: string;
  messageHistory?: string[];
  tone?: 'professional' | 'friendly' | 'casual';
}

export interface AIJobStatus {
  status: string;
  progress?: number;
  result?: any;
  error?: string;
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

class AIService {
  // Chat with AI (non-streaming)
  async chat(request: AIChatRequest): Promise<{ response: string; timestamp: string }> {
    return api.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Generate smart reply for inbox
  async generateSmartReply(request: AISmartReplyRequest): Promise<{ reply: string; tone: string; timestamp: string }> {
    return api.request('/ai/smart-reply', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Queue revenue analysis job
  async queueRevenueAnalysis(period: string = 'month'): Promise<{ jobId: string; status: string; message: string; estimatedTime: string }> {
    return api.request('/ai/queue/revenue-analysis', {
      method: 'POST',
      body: JSON.stringify({ period }),
    });
  }

  // Queue task optimization job
  async queueTaskOptimization(): Promise<{ jobId: string; status: string; message: string; estimatedTime: string }> {
    return api.request('/ai/queue/task-optimization', {
      method: 'POST',
    });
  }

  // Get job status
  async getJobStatus(queueName: string, jobId: string): Promise<AIJobStatus> {
    return api.request(`/ai/job/${queueName}/${jobId}`);
  }

  // Get user's active jobs
  async getUserJobs(): Promise<{ jobs: AIJob[] }> {
    return api.request('/ai/jobs');
  }

  // AI health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return api.request('/ai/health');
  }

  // Chat with AI via WebSocket (streaming)
  async chatStreaming(
    request: AIChatRequest,
    onToken?: (token: string) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random()}`;

    return new Promise((resolve, reject) => {
      const socket = socketService.getSocket();
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      let fullResponse = '';

      // Set up event listeners
      const onTokenHandler = (data: { token: string; requestId: string }) => {
        if (data.requestId === requestId) {
          fullResponse += data.token;
          onToken?.(data.token);
        }
      };

      const onResponseHandler = (data: { message: string; requestId: string }) => {
        if (data.requestId === requestId) {
          onComplete?.(data.message);
          cleanup();
          resolve();
        }
      };

      const onErrorHandler = (data: { error: string; requestId: string }) => {
        if (data.requestId === requestId) {
          onError?.(data.error);
          cleanup();
          reject(new Error(data.error));
        }
      };

      const cleanup = () => {
        socket.off('ai-token', onTokenHandler);
        socket.off('ai-response', onResponseHandler);
        socket.off('ai-error', onErrorHandler);
      };

      // Register event listeners
      socket.on('ai-token', onTokenHandler);
      socket.on('ai-response', onResponseHandler);
      socket.on('ai-error', onErrorHandler);

      // Send the request
      socket.emit('ai-request', {
        ...request,
        requestId,
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        cleanup();
        reject(new Error('AI request timeout'));
      }, 5 * 60 * 1000);
    });
  }

  // Clean up old jobs (admin only)
  async cleanupJobs(): Promise<{ message: string; timestamp: string }> {
    return api.request('/ai/cleanup', {
      method: 'POST',
    });
  }
}

export default new AIService();
