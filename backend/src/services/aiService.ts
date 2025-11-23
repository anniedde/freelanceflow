import OpenAI from 'openai';
import logger from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export class AIService {
  private openai: OpenAI | null = null;

  /**
   * Extract JSON from response, removing markdown and extra text
   */
  private extractJSON(text: string): string {
    // Remove markdown code blocks
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to find JSON object boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      // Extract just the JSON object
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    return cleaned;
  }

  constructor() {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      logger.warn('GROK_API_KEY not found in environment variables - AI features will be disabled');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Send a chat message to Grok
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}) {
    if (!this.openai) {
      throw new Error('AI Service is not initialized - GROK_API_KEY is missing');
    }

    try {
      const {
        temperature = 0.7,
        maxTokens = 1000,
        stream = false,
        onToken
      } = options;

      if (stream && onToken) {
        // Handle streaming response
        const response = await this.openai.chat.completions.create({
          model: 'grok-4-1-fast-non-reasoning',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        });

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            onToken(content);
          }
        }
        return '';
      } else {
        // Handle non-streaming response
        const response = await this.openai.chat.completions.create({
          model: 'grok-4-1-fast-non-reasoning',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        });

        return response.choices[0]?.message?.content || '';
      }
    } catch (error) {
      logger.error('AI chat error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Generate a system prompt for freelance assistant context
   */
  getSystemPrompt(): string {
    return `You are a helpful freelance assistant. You help freelancers manage their business, communicate with clients, optimize workflows, and make data-driven decisions.

Key capabilities:
- Draft professional emails and messages
- Analyze business data and provide insights
- Generate invoices and contract suggestions
- Optimize schedules and task prioritization
- Provide marketing and business advice

Always be concise, actionable, and professional. Use friendly but professional tone. Focus on practical advice that helps freelancers succeed.`;
  }

  /**
   * Generate a response for inbox/smart replies
   */
  async generateSmartReply(
    context: string,
    messageHistory: string[],
    tone: 'professional' | 'friendly' | 'casual' = 'professional'
  ): Promise<string> {
    const systemPrompt = `${this.getSystemPrompt()}

Generate a ${tone} reply to a client message. Consider the context and conversation history. Keep it concise and actionable.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context: ${context}\n\nRecent conversation:\n${messageHistory.join('\n')}\n\nGenerate a reply:` }
    ];

    return this.chat(messages, { temperature: 0.6 });
  }

  /**
   * Analyze revenue data and generate insights
   */
  async analyzeRevenueData(revenueData: any[], period: string): Promise<{
    insights: string[];
    projectedRevenue: number;
    confidence: number;
  }> {
    const systemPrompt = `You are a financial analyst specializing in freelance business analysis.

Analyze the provided revenue data which includes:
- Historical months with actual revenue (amount is a number)
- Future months that need projections (amount is null)

Your tasks:
1. Identify trends and patterns in the historical data
2. ONLY project revenue for future months where amount is null
3. DO NOT change or project values for months that already have actual data
4. Provide actionable business insights based on the trends
5. Calculate confidence level (0-100%) for your projections

Return your analysis in JSON format with keys:
- insights: array of 3-5 actionable insights as strings
- projectedRevenue: total projected revenue for ONLY the future months (sum of projections)
- confidence: number between 0-100 representing confidence in projections`;

    const dataString = JSON.stringify(revenueData, null, 2);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this revenue timeline. Note that months with "isPast: true" are historical with actual data. Months with "isPast: false" and "amount: null" are future months requiring projections.\n\n${dataString}\n\nProvide projections ONLY for future months (where amount is null).` }
    ];

    const response = await this.chat(messages, { temperature: 0.3 });

    try {
      const cleanedResponse = this.extractJSON(response);
      const parsed = JSON.parse(cleanedResponse);
      return {
        insights: parsed.insights || [],
        projectedRevenue: parsed.projectedRevenue || 0,
        confidence: parsed.confidence || 50
      };
    } catch (error) {
      logger.error('Failed to parse AI revenue analysis:', error);
      return {
        insights: ['Unable to analyze data at this time'],
        projectedRevenue: 0,
        confidence: 0
      };
    }
  }

  /**
   * Generate task optimization suggestions
   */
  async optimizeTasks(tasks: any[]): Promise<{
    suggestions: string[];
    priorityOrder: number[];
  }> {
    const systemPrompt = `You are a productivity expert for freelancers.

Analyze the provided tasks and:
1. Suggest optimal order based on priority, deadlines, and dependencies
2. Provide productivity tips
3. Identify potential bottlenecks

Return in JSON format with keys: suggestions (array), priorityOrder (array of task indices).`;

    const tasksString = JSON.stringify(tasks, null, 2);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Optimize these tasks:\n\n${tasksString}` }
    ];

    const response = await this.chat(messages, { temperature: 0.4 });

    try {
      const cleanedResponse = this.extractJSON(response);
      const parsed = JSON.parse(cleanedResponse);
      return {
        suggestions: parsed.suggestions || [],
        priorityOrder: parsed.priorityOrder || []
      };
    } catch (error) {
      logger.error('Failed to parse AI task optimization:', error);
      return {
        suggestions: ['Unable to optimize tasks at this time'],
        priorityOrder: []
      };
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testMessage: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await this.chat(testMessage, { maxTokens: 10 });
      return true;
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AIService();
