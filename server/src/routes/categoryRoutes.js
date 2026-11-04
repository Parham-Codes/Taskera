import express from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
} from '../controllers/categoryController.js';
import { protectAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(protectAuth);

router.route('/').get(getCategories).post(createCategory);
router.route('/:categoryId').patch(updateCategory).delete(deleteCategory);

export default router;
