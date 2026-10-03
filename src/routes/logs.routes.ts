import { Router } from 'express';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
