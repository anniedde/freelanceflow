import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// List clients
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { search, limit = '20' } = req.query;

    const where: any = {
      userId: req.user!.sub,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        projects: {
          select: { id: true },
        },
      },
    });

    res.json(clients);
  } catch (error) {
    logger.error('List clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients', code: 500 });
  }
});

// Create client
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, avatarUrl, tags, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required', code: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        avatarUrl,
        tags: tags || [],
        notes,
        userId: req.user!.sub,
        teamId: req.user!.teamId,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    logger.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client', code: 500 });
  }
});

// Get client details
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
      include: {
        projects: {
          include: {
            tasks: true,
            invoices: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found', code: 404 });
    }

    res.json(client);
  } catch (error) {
    logger.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client', code: 500 });
  }
});

// Update client
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, avatarUrl, tags, notes, totalRevenue, lastContact } = req.body;

    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found', code: 404 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(tags && { tags }),
        ...(notes !== undefined && { notes }),
        ...(totalRevenue !== undefined && { totalRevenue }),
        ...(lastContact && { lastContact: new Date(lastContact) }),
      },
    });

    res.json(updatedClient);
  } catch (error) {
    logger.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client', code: 500 });
  }
});

// Delete client
router.delete('/:id', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.sub,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found', code: 404 });
    }

    await prisma.client.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client', code: 500 });
  }
});

export default router;
