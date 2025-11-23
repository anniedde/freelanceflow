import prisma from './db';
import logger from './logger';

export interface UserContext {
  clients: any[];
  projects: any[];
  tasks: any[];
  invoices: any[];
  metrics: {
    totalRevenue: number;
    activeProjects: number;
    completedProjects: number;
    pendingInvoices: number;
  };
}

/**
 * Fetch comprehensive context about a user's freelance business
 */
export async function getUserContext(userId: string): Promise<UserContext> {
  try {
    // Get user's team for filtering
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true },
    });

    const whereClause = user?.teamId
      ? {
          OR: [
            { userId },
            { teamId: user.teamId },
          ],
        }
      : { userId };

    // Fetch clients with their project counts
    const clients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        tags: true,
        totalRevenue: true,
        lastContact: true,
        projects: {
          select: {
            id: true,
            status: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to most recent
    });

    // Fetch projects with relevant details
    const projects = await prisma.project.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        budget: true,
        type: true,
        dueDate: true,
        client: {
          select: {
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    // Fetch recent tasks
    const tasks = await prisma.task.findMany({
      where: {
        ...(user?.teamId
          ? {
              OR: [
                { userId },
                { teamId: user.teamId },
              ],
            }
          : {
              userId,
            }),
        status: {
          not: 'COMPLETED',
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        project: {
          select: {
            name: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        createdAt: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        project: whereClause,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        dueDate: true,
        paidDate: true,
        project: {
          select: {
            name: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Calculate key metrics
    const totalRevenue = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const activeProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE').length;

    return {
      clients: clients.map(c => ({
        name: c.name,
        email: c.email,
        tags: c.tags.join(', ') || 'None',
        totalRevenue: c.totalRevenue,
        lastContact: c.lastContact?.toISOString().split('T')[0] || 'Never',
        projectCount: c.projects.length,
        activeProjects: c.projects.filter(p => p.status === 'IN_PROGRESS').length,
        joinedDate: c.createdAt.toISOString().split('T')[0],
      })),
      projects: projects.map(p => ({
        name: p.name,
        description: p.description,
        status: p.status,
        budget: p.budget,
        type: p.type,
        dueDate: p.dueDate?.toISOString().split('T')[0],
        client: p.client.name,
        taskCount: p.tasks.length,
        completedTasks: p.tasks.filter(t => t.status === 'COMPLETED').length,
        startedDate: p.createdAt.toISOString().split('T')[0],
      })),
      tasks: tasks.map(t => ({
        title: t.name,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().split('T')[0],
        project: t.project?.name || 'No project',
        client: t.project?.client?.name || 'No client',
      })),
      invoices: invoices.map(inv => ({
        invoiceId: inv.id.substring(0, 8),
        amount: inv.amount,
        status: inv.status,
        dueDate: inv.dueDate?.toISOString().split('T')[0],
        paidDate: inv.paidDate?.toISOString().split('T')[0],
        project: inv.project.name,
        client: inv.project.client.name,
      })),
      metrics: {
        totalRevenue,
        activeProjects,
        completedProjects,
        pendingInvoices,
      },
    };
  } catch (error) {
    logger.error('Error fetching user context:', error);
    return {
      clients: [],
      projects: [],
      tasks: [],
      invoices: [],
      metrics: {
        totalRevenue: 0,
        activeProjects: 0,
        completedProjects: 0,
        pendingInvoices: 0,
      },
    };
  }
}

/**
 * Build a context-aware system prompt with user's business data
 */
export function buildContextAwarePrompt(context: UserContext): string {
  const { clients, projects, tasks, invoices, metrics } = context;

  let prompt = `You are a FreelanceFlow assistant. Answer questions using the data below. Read the user's question carefully and provide the specific information they asked for.

BUSINESS METRICS:
- Total Revenue: $${metrics.totalRevenue.toLocaleString()}
- Active Projects: ${metrics.activeProjects}
- Completed Projects: ${metrics.completedProjects}
- Pending Invoices: ${metrics.pendingInvoices}

`;

  // Add clients section
  if (clients.length > 0) {
    prompt += `CLIENTS (${clients.length} total):\n`;
    clients.slice(0, 10).forEach((client, idx) => {
      prompt += `${idx + 1}. ${client.name} - Tags: ${client.tags} - ${client.activeProjects} active/${client.projectCount} total projects - Last contact: ${client.lastContact}\n`;
    });
    if (clients.length > 10) {
      prompt += `... and ${clients.length - 10} more\n`;
    }
    prompt += '\n';
  }

  // Add projects section
  if (projects.length > 0) {
    prompt += `PROJECTS (${projects.length} total):\n`;
    projects.slice(0, 10).forEach((project, idx) => {
      const progress = project.taskCount > 0
        ? Math.round((project.completedTasks / project.taskCount) * 100)
        : 0;
      const budget = project.budget ? `$${project.budget.toLocaleString()}` : 'No budget';
      prompt += `${idx + 1}. "${project.name}" for ${project.client} - Status: ${project.status} - Budget: ${budget} - Progress: ${progress}% - Due: ${project.dueDate || 'Not set'}\n`;
    });
    if (projects.length > 10) {
      prompt += `... and ${projects.length - 10} more\n`;
    }
    prompt += '\n';
  }

  // Add tasks section
  if (tasks.length > 0) {
    prompt += `TASKS (${tasks.length} active/pending):\n`;
    tasks.slice(0, 15).forEach((task, idx) => {
      prompt += `${idx + 1}. ${task.title} - Status: ${task.status} - Priority: ${task.priority} - Project: ${task.project} - Client: ${task.client} - Due: ${task.dueDate || 'Not set'}\n`;
    });
    if (tasks.length > 15) {
      prompt += `... and ${tasks.length - 15} more\n`;
    }
    prompt += '\n';
  }

  // Add invoices section
  if (invoices.length > 0) {
    prompt += `INVOICES (${invoices.length} total):\n`;
    invoices.slice(0, 10).forEach((inv, idx) => {
      prompt += `${idx + 1}. Invoice ${inv.invoiceId} - Amount: $${inv.amount} - Status: ${inv.status} - Client: ${inv.client} - Project: ${inv.project} - Due: ${inv.dueDate || 'Not set'}`;
      if (inv.paidDate) {
        prompt += ` - Paid: ${inv.paidDate}`;
      }
      prompt += '\n';
    });
    if (invoices.length > 10) {
      prompt += `... and ${invoices.length - 10} more\n`;
    }
    prompt += '\n';
  }

  prompt += `---

When the user asks a question, answer it directly using the specific data section above. Be concise and list the relevant items clearly.`;

  return prompt;
}

/**
 * Analyze user query to determine what context is needed
 */
export function analyzeQueryIntent(query: string): {
  needsClients: boolean;
  needsProjects: boolean;
  needsTasks: boolean;
  needsInvoices: boolean;
  needsMetrics: boolean;
} {
  const lowerQuery = query.toLowerCase();

  return {
    needsClients:
      lowerQuery.includes('client') ||
      lowerQuery.includes('customer') ||
      lowerQuery.includes('who'),
    needsProjects:
      lowerQuery.includes('project') ||
      lowerQuery.includes('work') ||
      lowerQuery.includes('working on'),
    needsTasks:
      lowerQuery.includes('task') ||
      lowerQuery.includes('todo') ||
      lowerQuery.includes('deadline') ||
      lowerQuery.includes('due'),
    needsInvoices:
      lowerQuery.includes('invoice') ||
      lowerQuery.includes('payment') ||
      lowerQuery.includes('paid') ||
      lowerQuery.includes('owe') ||
      lowerQuery.includes('revenue'),
    needsMetrics:
      lowerQuery.includes('how') ||
      lowerQuery.includes('status') ||
      lowerQuery.includes('summary') ||
      lowerQuery.includes('overview'),
  };
}
