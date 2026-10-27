import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeAdmin } from '../middleware/authorizeAdmin.js';

const router = Router();

router.use(authenticate);
router.get('/me', users.me);
router.get('/', authorizeAdmin, users.list);
router.post('/', authorizeAdmin, users.create);
router.delete('/:id', authorizeAdmin, users.remove);

export default router;
