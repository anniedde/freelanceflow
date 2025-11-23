import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateProjections, calculateR2, polynomialRegression, predict } from '../utils/regression';

const router = Router();

// Test regression endpoint
router.get('/test-regression', authenticate, async (req: AuthRequest, res) => {
  try {
    // Test with sample data
    const testData = [
      { x: 0, y: 2800 },
      { x: 1, y: 3200 },
      { x: 2, y: 2950 },
      { x: 3, y: 3600 },
      { x: 4, y: 3400 },
      { x: 5, y: 3800 },
    ];

    const coefficients = polynomialRegression(testData, 2);
    const rSquared = calculateR2(testData, coefficients);
    const projections = generateProjections(testData, 3, 2);

    res.json({
      status: 'success',
      testData,
      coefficients,
      rSquared,
      projections,
      message: 'Regression test successful'
    });
  } catch (error) {
    logger.error('Test regression error:', error);
    res.status(500).json({ error: 'Test failed', details: (error as Error).message });
  }
});

// Get revenue analytics
router.get('/revenue', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let monthsToShow = 6;

    switch (period) {
      case 'week':
        // Last 4 weeks
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        monthsToShow = 1;
        break;
      case 'month':
        // Current month only
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        monthsToShow = 1;
        break;
      case 'quarter':
        // Last 3 months (current quarter)
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        monthsToShow = 3;
        break;
      case 'year':
        // Current year (12 months)
        startDate = new Date(now.getFullYear(), 0, 1);
        monthsToShow = 12;
        break;
      default:
        // Default: last 6 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        monthsToShow = 6;
    }

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { teamId: true },
    });

    // Get paid invoices for revenue trends (include team data if user is part of a team)
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: startDate,
        },
        project: user?.teamId
          ? {
              OR: [
                { userId: req.user!.sub },
                { teamId: user.teamId },
              ],
            }
          : {
              userId: req.user!.sub,
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

    // Group invoices by month for trends
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth: { [key: string]: number } = {};

    // Initialize months from startDate forward
    for (let i = 0; i < monthsToShow; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthKey = `${monthNames[date.getMonth()]}`;
      revenueByMonth[monthKey] = 0;
    }

    // Sum invoices by month
    paidInvoices.forEach(invoice => {
      if (invoice.paidDate) {
        const monthKey = monthNames[invoice.paidDate.getMonth()];
        if (revenueByMonth[monthKey] !== undefined) {
          revenueByMonth[monthKey] += invoice.amount;
        }
      }
    });

    // Build trends array - filter out leading zeros to avoid confusion with projected months
    const allMonths = Object.keys(revenueByMonth).map((month, index) => ({
      month,
      actual: Math.round(revenueByMonth[month]),
      index, // Add index for regression
    }));

    // Find first month with non-zero revenue
    const firstDataIndex = allMonths.findIndex(m => m.actual > 0);
    // Keep months from first data point onwards (including trailing zeros like December)
    const trends = firstDataIndex >= 0
      ? allMonths.slice(firstDataIndex).map((m, idx) => ({ ...m, index: idx }))
      : allMonths;

    logger.info(`Analytics: Found ${paidInvoices.length} paid invoices, trends: ${JSON.stringify(trends)}`);

    // Generate polynomial regression projections
    let projections: any[] = [];
    let rSquared: number | null = null;

    if (trends.length >= 3) {
      // Need at least 3 data points for meaningful projections
      const dataPoints = trends.map(t => ({ x: t.index, y: t.actual }));

      // Use quadratic (degree 2) or cubic (degree 3) based on data size
      const degree = trends.length >= 5 ? 3 : 2;

      // Calculate polynomial coefficients and R²
      const coefficients = polynomialRegression(dataPoints, degree);
      rSquared = calculateR2(dataPoints, coefficients);

      // Add regression fitted values to ALL existing trends (for visualization)
      trends.forEach(trend => {
        const fittedY = predict(trend.index, coefficients);
        trend.projected = Math.round(fittedY);
      });

      // Determine how many future points to project based on period
      let futurePoints = 3; // default
      switch (period) {
        case 'week':
          futurePoints = 4; // 4 weeks ahead
          break;
        case 'month':
          futurePoints = 3; // 3 months ahead
          break;
        case 'quarter':
          futurePoints = 3; // 3 quarters ahead
          break;
        case 'year':
          futurePoints = 3; // 3 years ahead
          break;
      }

      // Generate future projections
      const futureDataPoints = generateProjections(dataPoints, futurePoints, degree);

      // Convert back to month labels
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const lastMonthIndex = trends.length > 0 ? monthNames.indexOf(trends[trends.length - 1].month) : -1;

      projections = futureDataPoints.map((point, i) => {
        const monthIndex = (lastMonthIndex + i + 1) % 12;
        return {
          month: monthNames[monthIndex],
          projected: Math.round(point.y),
        };
      });

      logger.info(`Generated ${projections.length} projections with R²=${rSquared?.toFixed(3)}`);
    } else {
      logger.warn('Not enough data points for projections (need at least 3)');
    }

    // Get all projects for activity metrics (include team data)
    const projects = await prisma.project.findMany({
      where: user?.teamId
        ? {
            OR: [
              { userId: req.user!.sub },
              { teamId: user.teamId },
            ],
          }
        : {
            userId: req.user!.sub,
          },
      include: {
        tasks: true,
      },
    });

    // Calculate activity metrics
    const completedProjects = projects.filter(p => p.status === 'COMPLETED');
    const avgCycleTime = completedProjects.length > 0
      ? completedProjects.reduce((sum, p) => {
          const start = p.createdAt.getTime();
          const end = p.updatedAt.getTime();
          const days = (end - start) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedProjects.length
      : 0;

    // Get all clients (include team data)
    const clients = await prisma.client.findMany({
      where: user?.teamId
        ? {
            OR: [
              { userId: req.user!.sub },
              { teamId: user.teamId },
            ],
          }
        : {
            userId: req.user!.sub,
          },
    });

    // Client retention (clients with projects in last 90 days / total clients)
    const recentDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const activeClients = await prisma.client.findMany({
      where: {
        ...(user?.teamId
          ? {
              OR: [
                { userId: req.user!.sub },
                { teamId: user.teamId },
              ],
            }
          : {
              userId: req.user!.sub,
            }),
        projects: {
          some: {
            createdAt: {
              gte: recentDate,
            },
          },
        },
      },
    });

    const clientRetention = clients.length > 0
      ? Math.round((activeClients.length / clients.length) * 100)
      : 0;

    const avgProjectValue = completedProjects.length > 0 && completedProjects.filter(p => p.budget).length > 0
      ? Math.round(completedProjects.filter(p => p.budget).reduce((sum, p) => sum + (p.budget || 0), 0) / completedProjects.filter(p => p.budget).length)
      : 0;

    const metrics = {
      avgCycleTime: Math.round(avgCycleTime * 10) / 10,
      clientRetention,
      projectsCompleted: completedProjects.length,
      avgProjectValue,
    };

    // Basic insights based on data
    const insights = [];
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    if (totalRevenue > 0) {
      insights.push({
        id: '1',
        type: 'opportunity',
        message: `Total revenue of $${Math.round(totalRevenue).toLocaleString()} collected. Keep up the great work!`,
        priority: 'medium',
      });
    }

    if (clientRetention < 50 && clients.length > 0) {
      insights.push({
        id: '2',
        type: 'warning',
        message: `Client retention at ${clientRetention}%. Consider reaching out to inactive clients.`,
        priority: 'high',
      });
    } else if (clientRetention >= 75) {
      insights.push({
        id: '3',
        type: 'opportunity',
        message: `Excellent client retention at ${clientRetention}%! Consider upselling to existing clients.`,
        priority: 'low',
      });
    }

    const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS');
    if (inProgressProjects.length > 5) {
      insights.push({
        id: '4',
        type: 'recommendation',
        message: `You have ${inProgressProjects.length} projects in progress. Consider prioritizing to avoid overcommitment.`,
        priority: 'medium',
      });
    }

    res.json({
      trends,
      projections,
      metrics,
      insights,
      period,
      rSquared,
    });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', code: 500 });
  }
});

// Run AI analysis
router.post('/run-analysis', authenticate, async (req: AuthRequest, res) => {
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

    // Get paid invoices
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

    // Format revenue data for AI - include all months, not just ones with data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Determine how many months to analyze based on period
    let monthsToAnalyze = 12;
    switch (period) {
      case 'week':
      case 'month':
        monthsToAnalyze = 6; // Analyze 6 months: 3 past + current + 2 future
        break;
      case 'quarter':
        monthsToAnalyze = 6; // 3 past + 3 future
        break;
      case 'year':
        monthsToAnalyze = 15; // 12 past + 3 future
        break;
    }

    // Build complete timeline with actual data and placeholder for future months
    const revenueByMonth: { month: string; year: number; amount: number | null; isPast: boolean }[] = [];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start from the earlier of startDate or (now - monthsToAnalyze)
    const analysisStartDate = new Date(startDate);
    analysisStartDate.setMonth(analysisStartDate.getMonth() - 3); // Add 3 months before startDate for context

    for (let i = 0; i < monthsToAnalyze; i++) {
      const date = new Date(analysisStartDate.getFullYear(), analysisStartDate.getMonth() + i, 1);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const isPast = date <= now;

      // Find actual revenue for this month
      const monthRevenue = paidInvoices
        .filter(inv => inv.paidDate &&
                inv.paidDate.getMonth() === date.getMonth() &&
                inv.paidDate.getFullYear() === date.getFullYear())
        .reduce((sum, inv) => sum + inv.amount, 0);

      revenueByMonth.push({
        month: `${month} ${year}`,
        year,
        amount: isPast ? monthRevenue : null,
        isPast
      });
    }

    logger.info(`Sending ${revenueByMonth.length} months to AI, ${revenueByMonth.filter(m => m.isPast).length} with actual data`);

    // Run AI analysis (import dynamically to avoid circular dependencies)
    const { default: aiService } = await import('../services/aiService');
    const analysis = await aiService.analyzeRevenueData(revenueByMonth, period);

    // Create AI insights from the analysis
    const aiInsights = analysis.insights.map((insight: string, index: number) => ({
      id: `ai-${index + 1}`,
      type: insight.toLowerCase().includes('warning') || insight.toLowerCase().includes('risk')
        ? 'warning'
        : insight.toLowerCase().includes('opportunity') || insight.toLowerCase().includes('increase')
        ? 'opportunity'
        : 'recommendation',
      message: insight,
      priority: insight.toLowerCase().includes('urgent') || insight.toLowerCase().includes('critical')
        ? 'high'
        : insight.toLowerCase().includes('consider') || insight.toLowerCase().includes('may')
        ? 'low'
        : 'medium',
    }));

    res.json({
      status: 'completed',
      message: 'AI analysis completed successfully',
      period,
      analysis: {
        insights: aiInsights,
        projectedRevenue: analysis.projectedRevenue,
        confidence: analysis.confidence,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Run analysis error:', error);

    // Check if it's an API key error
    if (error.message && error.message.includes('GROK_API_KEY')) {
      res.status(503).json({
        error: 'AI features are disabled',
        message: 'Please add your GROK_API_KEY to the .env file to enable AI analysis. Get your API key at https://console.x.ai/',
        code: 503
      });
    } else {
      res.status(500).json({ error: 'Failed to run analysis', code: 500 });
    }
  }
});

export default router;
