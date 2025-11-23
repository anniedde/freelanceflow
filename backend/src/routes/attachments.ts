import { Router } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../config/multer';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Public routes (no authentication - for viewing/downloading in new browser tabs)
// View attachment (inline)
router.get('/attachments/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found', code: 404 });
    }

    // Construct file path
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, attachment.fileUrl);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk', code: 404 });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);

    // Send file
    return res.sendFile(filePath);
  } catch (error) {
    logger.error('View attachment error:', error);
    res.status(500).json({ error: 'Failed to view attachment', code: 500 });
  }
});

// Download attachment
router.get('/attachments/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found', code: 404 });
    }

    // Construct file path
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, attachment.fileUrl);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk', code: 404 });
    }

    // Set headers for download
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);

    // Send file
    return res.sendFile(filePath);
  } catch (error) {
    logger.error('Download attachment error:', error);
    res.status(500).json({ error: 'Failed to download attachment', code: 500 });
  }
});

// Protected routes (require authentication)
// Upload attachment to project
router.post('/projects/:projectId/attachments', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', code: 400 });
    }

    // Check if project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      // Delete the uploaded file since we're rejecting the request
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        logger.error('Failed to delete orphaned file:', error);
      }
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.originalname,
        fileUrl: req.file.filename, // The generated filename from multer
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        projectId,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    logger.error('Upload attachment error:', error);

    // Try to delete the uploaded file if database operation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete file after error:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Failed to upload attachment', code: 500 });
  }
});

// Get all attachments for a project
router.get('/projects/:projectId/attachments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user!.sub,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 404 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attachments);
  } catch (error) {
    logger.error('Get attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch attachments', code: 500 });
  }
});

// Delete attachment
router.delete('/attachments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get attachment with project info to verify ownership
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found', code: 404 });
    }

    // Check if user owns the project
    if (attachment.project.userId !== req.user!.sub) {
      return res.status(403).json({ error: 'Unauthorized to delete this attachment', code: 403 });
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id },
    });

    // Delete file from disk
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const filePath = path.join(uploadsDir, attachment.fileUrl);
      await fs.unlink(filePath);
    } catch (error) {
      logger.error('Failed to delete file from disk:', error);
      // Continue even if file deletion fails
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment', code: 500 });
  }
});

export default router;
