import { Router } from 'express';
import * as expenses from '../controllers/expenseController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Ownership rules (own expenses vs. all for admins) are enforced in the expense service.
router.use(authenticate);
router.get('/', expenses.list);
router.post('/', expenses.create);
router.get('/:id', expenses.get);
router.put('/:id', expenses.update);
router.delete('/:id', expenses.remove);

export default router;
