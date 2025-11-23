import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List tasks
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { priority, due, status } = req.query;

    const where: any = {
      userId: req.user!.sub,
    };

    if (priority) {
      where.priority = parseInt(priority as string);
    }

    if (status) {
      where.status = status;
    }

    if (due === 'overdue') {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = {
        not: 'COMPLETED',
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(tasks);
  } catch (error) {
    logger.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', code: 500 });
  }
});

// Update task
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, progress, status, priority, dueDate, category } = req.body;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found', code: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(progress !== undefined && { progress }),
        ...(status && { status }),
        ...(priority !== undefined && { priority }),
        ...(category !== undefined && { category }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    res.json(updatedTask);
  } catch (error) {
    logger.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task', code: 500 });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found', code: 404 });
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task', code: 500 });
  }
});

export default router;
