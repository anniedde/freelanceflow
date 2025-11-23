import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, teamName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists', code: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;
    let team;

    if (teamName) {
      // Create user with team
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: 'ADMIN',
          },
        });

        const newTeam = await tx.team.create({
          data: {
            name: teamName,
            ownerId: newUser.id,
          },
        });

        await tx.user.update({
          where: { id: newUser.id },
          data: { teamId: newTeam.id },
        });

        return { user: newUser, team: newTeam };
      });

      user = result.user;
      team = result.team;
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        teamId: team?.id,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword,
      team,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', code: 500 });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', code: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { team: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials', code: 401 });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
      team: user.team,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', code: 500 });
  }
});

export default router;
