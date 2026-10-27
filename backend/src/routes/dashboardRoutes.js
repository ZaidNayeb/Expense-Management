import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/summary', dashboard.summary);
router.get('/recent-expenses', dashboard.recentExpenses);
router.get('/spending-trend', dashboard.spendingTrend);

export default router;
