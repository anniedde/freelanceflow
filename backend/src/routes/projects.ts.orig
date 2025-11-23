import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List projects
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, clientId, sort = 'createdAt' } = req.query;

    const where: any = {
      userId: req.user!.sub,
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { [sort as string]: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    res.json(projects);
  } catch (error) {
    logger.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects', code: 500 });
  }
});

// Create project
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, type, budget, status, dueDate, clientId } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ error: 'Name and clientId are required', code: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        type,
        budget,
        status: status || 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : null,
        clientId,
        userId: req.user!.sub,
        teamId: req.user!.teamId,
      },
      include: {
        client: true,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project', code: 500 });
  }
});

// Get project details
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
      include: {
        client: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: true,
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    res.json(project);
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project', code: 500 });
  }
});

// Update project
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, type, budget, status, dueDate } = req.body;

    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(budget !== undefined && { budget }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        client: true,
        tasks: true,
      },
    });

    res.json(updatedProject);
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project', code: 500 });
  }
});

// Add task to project
router.post('/:id/tasks', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, dueDate, priority, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Task name is required', code: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 1,
        category,
        projectId: req.params.id,
        userId: req.user!.sub,
        teamId: req.user!.teamId,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task', code: 500 });
  }
});

export default router;
