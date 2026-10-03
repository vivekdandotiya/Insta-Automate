import { Router } from 'express';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sources = await prisma.instagramSource.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: sources });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { username, profile_url, priority } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (!username.startsWith('@')) {
      username = `@${username}`;
    }

    const newSource = await prisma.instagramSource.create({
      data: {
        username,
        profile_url: profile_url || `https://www.instagram.com/${username.replace('@', '')}/`,
        priority: priority || 'NORMAL',
        enabled: true
      }
    });

    res.json({ success: true, data: newSource });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.instagramSource.delete({ where: { id } });
    res.json({ success: true, message: 'Source deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.instagramSource.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ success: false, error: 'Source not found' });

    const updated = await prisma.instagramSource.update({
      where: { id },
      data: { enabled: !source.enabled }
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
