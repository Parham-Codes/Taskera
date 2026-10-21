import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Task from '../models/Task.js';
import OrganizationMember, { ORG_ROLES } from '../models/OrganizationMember.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Get categories for current workspace context (Personal or Organization)
 */
export const getCategories = async (req, res, next) => {
  try {
    const { organizationId } = req.query;

    const query = {};

    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return errorResponse(res, {
          message: 'Invalid Organization ID format',
          statusCode: 400,
        });
      }

      // Verify membership
      const membership = await OrganizationMember.findOne({
        organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      query.organizationId = organizationId;
    } else {
      // Personal space: categories created by the logged-in user with no organization
      query.organizationId = null;
      query.createdBy = req.user._id;
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();

    return successResponse(res, {
      message: 'Categories retrieved successfully',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, color, organizationId } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, {
        message: 'Category name is required',
        statusCode: 400,
      });
    }

    let targetOrgId = null;

    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return errorResponse(res, {
          message: 'Invalid Organization ID format',
          statusCode: 400,
        });
      }

      const membership = await OrganizationMember.findOne({
        organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      targetOrgId = organizationId;
    }

    // Check duplicate name within the same workspace
    const existing = await Category.findOne({
      name: name.trim(),
      organizationId: targetOrgId,
      ...(targetOrgId ? {} : { createdBy: req.user._id }),
    }).lean();

    if (existing) {
      return errorResponse(res, {
        message: 'A category with this name already exists in this workspace',
        statusCode: 409,
      });
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || '#4F5AE4',
      organizationId: targetOrgId,
      createdBy: req.user._id,
    });

    return successResponse(res, {
      message: 'Category created successfully',
      statusCode: 201,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a Category
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return errorResponse(res, {
        message: 'Invalid Category ID format',
        statusCode: 400,
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return errorResponse(res, {
        message: 'Category not found',
        statusCode: 404,
      });
    }

    // Authorization
    if (category.organizationId) {
      const membership = await OrganizationMember.findOne({
        organizationId: category.organizationId,
        userId: req.user._id,
      }).lean();

      if (
        !membership ||
        (membership.role !== ORG_ROLES.OWNER &&
          membership.role !== ORG_ROLES.MANAGER &&
          category.createdBy.toString() !== req.user.id)
      ) {
        return errorResponse(res, {
          message: 'Access denied to delete this category',
          statusCode: 403,
        });
      }
    } else if (category.createdBy.toString() !== req.user.id) {
      return errorResponse(res, {
        message: 'Access denied to delete this personal category',
        statusCode: 403,
      });
    }

    // Remove category reference from existing tasks
    await Task.updateMany({ categoryId: category._id }, { $set: { categoryId: null } });

    await category.deleteOne();

    return successResponse(res, {
      message: 'Category deleted successfully',
      data: { categoryId },
    });
  } catch (error) {
    next(error);
  }
};
