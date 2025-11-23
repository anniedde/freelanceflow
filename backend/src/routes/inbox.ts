import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get messages
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { unread } = req.query;

    const where: any = {};

    if (unread === 'true') {
      where.read = false;
    }

    // Get messages for user's clients and projects
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            client: {
              userId: req.user!.sub,
            },
          },
          {
            project: {
              userId: req.user!.sub,
            },
          },
        ],
        ...where,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(messages);
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages', code: 500 });
  }
});

// Send message
router.post('/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, clientId, projectId, isFromAI = false } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required', code: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        clientId,
        projectId,
        isFromAI,
      },
      include: {
        client: true,
        project: true,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', code: 500 });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json(message);
  } catch (error) {
    logger.error('Mark message read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read', code: 500 });
  }
});

export default router;
