import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all invoices for a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        projectId: req.params.projectId,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    logger.error('Get project invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices', code: 500 });
  }
});

// Create invoice
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, amount, status, dueDate, paidDate, fileUrl } = req.body;

    if (!projectId || amount === undefined) {
      return res.status(400).json({ error: 'ProjectId and amount are required', code: 400 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        amount,
        status: status || 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : null,
        paidDate: paidDate ? new Date(paidDate) : null,
        fileUrl,
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice', code: 500 });
  }
});

// Update invoice
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, status, dueDate, paidDate, fileUrl } = req.body;

    // Find invoice and verify ownership through project
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
      },
      include: {
        project: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found', code: 404 });
    }

    if (invoice.project.userId !== req.user!.sub) {
      return res.status(403).json({ error: 'Unauthorized', code: 403 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
        ...(fileUrl !== undefined && { fileUrl }),
      },
    });

    res.json(updatedInvoice);
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice', code: 500 });
  }
});

// Delete invoice
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Find invoice and verify ownership through project
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
      },
      include: {
        project: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found', code: 404 });
    }

    if (invoice.project.userId !== req.user!.sub) {
      return res.status(403).json({ error: 'Unauthorized', code: 403 });
    }

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice', code: 500 });
  }
});

export default router;
