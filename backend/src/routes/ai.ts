import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import aiService, { ChatMessage } from '../services/aiService';
import logger from '../utils/logger';
import prisma from '../utils/db';

const router = Router();

// Chat with AI (non-streaming)
router.post('/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const { messages, temperature = 0.7, maxTokens = 1000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 400
      });
    }

    // Add system prompt if not present
    const chatMessages: ChatMessage[] = messages[0]?.role === 'system'
      ? messages
      : [{ role: 'system', content: aiService.getSystemPrompt() }, ...messages];

    const response = await aiService.chat(chatMessages, {
      temperature,
      maxTokens,
    });

    res.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      code: 500
    });
  }
});

// Generate smart reply for inbox
router.post('/smart-reply', authenticate, async (req: AuthRequest, res) => {
  try {
    const { context, messageHistory = [], tone = 'professional' } = req.body;

    if (!context) {
      return res.status(400).json({
        error: 'Context is required',
        code: 400
      });
    }

    const reply = await aiService.generateSmartReply(context, messageHistory, tone);

    res.json({
      reply,
      tone,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Smart reply generation error:', error);
    res.status(500).json({
      error: 'Failed to generate smart reply',
      code: 500
    });
  }
});

// Analyze revenue data synchronously
router.post('/analyze-revenue', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = 'month' } = req.body;
    const userId = req.user!.sub;

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    // Get paid invoices for revenue analysis
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startDate,
        },
        project: user?.teamId
          ? {
              OR: [
                { userId },
                { teamId: user.teamId },
              ],
            }
          : {
              userId,
            },
      },
      select: {
        amount: true,
        paidDate: true,
      },
      orderBy: {
        paidDate: 'asc',
      },
    });

    // Format revenue data for AI
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth: { month: string; amount: number }[] = [];

    paidInvoices.forEach(invoice => {
      if (invoice.paidDate) {
        const month = monthNames[invoice.paidDate.getMonth()];
        const existing = revenueByMonth.find(r => r.month === month);
        if (existing) {
          existing.amount += invoice.amount;
        } else {
          revenueByMonth.push({ month, amount: invoice.amount });
        }
      }
    });

    // Run AI analysis
    const analysis = await aiService.analyzeRevenueData(revenueByMonth, period);

    res.json({
      analysis,
      revenueData: revenueByMonth,
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Revenue analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze revenue',
      code: 500
    });
  }
});

// Optimize user's tasks
router.post('/optimize-tasks', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.sub;

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    // Get user's tasks
    const tasks = await prisma.task.findMany({
      where: user?.teamId
        ? {
            OR: [
              { userId },
              { teamId: user.teamId },
            ],
          }
        : {
            userId,
          },
      include: {
        project: {
          select: {
            name: true,
            dueDate: true,
            budget: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    const optimization = await aiService.optimizeTasks(tasks);

    res.json({
      optimization,
      tasksCount: tasks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Task optimization error:', error);
    res.status(500).json({
      error: 'Failed to optimize tasks',
      code: 500
    });
  }
});

// AI health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await aiService.healthCheck();

    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('AI health check error:', error);
    res.status(500).json({
      status: 'error',
      error: 'AI service unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
