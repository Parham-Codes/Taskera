import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useWorkspace } from './WorkspaceContext.jsx';

const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (activeWorkspace?.id) {
        params.organizationId = activeWorkspace.id;
      }
      const res = await api.get('/categories', { params });
      if (res.data?.success) {
        setCategories(res.data.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name, color = '#4F5AE4') => {
    try {
      const payload = {
        name: name.trim(),
        color,
        organizationId: activeWorkspace?.id || null,
      };
      const res = await api.post('/categories', payload);
      if (res.data?.success) {
        const newCat = res.data.data.category;
        setCategories((prev) => [...prev, newCat]);
        return { success: true, category: newCat };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to create category',
      };
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const res = await api.delete(`/categories/${categoryId}`);
      if (res.data?.success) {
        setCategories((prev) => prev.filter((c) => c._id !== categoryId));
        return { success: true };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to delete category',
      };
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        loading,
        fetchCategories,
        createCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
