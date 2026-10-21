import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      default: '#4F5AE4',
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // null = Personal Space category
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Category creator is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance index for filtering categories within a workspace
categorySchema.index({ organizationId: 1, createdBy: 1 });
categorySchema.index({ organizationId: 1, name: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
