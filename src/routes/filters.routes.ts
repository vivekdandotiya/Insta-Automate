import { Router, Request, Response } from 'express';
import { FilterService } from '../services/filter.service.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const prefs = await FilterService.getUserPreferences();
    res.json({ success: true, data: prefs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { roles, locations, experienceLevels, minRelevance, notificationMode } = req.body;
    const updated = await FilterService.updateUserPreferences({
      roles,
      locations,
      experienceLevels,
      minRelevance,
      notificationMode
    });
    res.json({ success: true, data: updated, message: 'Preferences updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
