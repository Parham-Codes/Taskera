import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  // null = Personal Space, or { id, name, slug, role } = Team Organization
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }

    setLoadingWorkspaces(true);
    try {
      const res = await api.get('/organizations/my');
      if (res.data?.success) {
        setWorkspaces(res.data.data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [user]);

  const fetchMembers = useCallback(async (orgId) => {
    if (!orgId) {
      setMembers([]);
      return;
    }
    try {
      const res = await api.get(`/organizations/${orgId}/members`);
      if (res.data?.success) {
        setMembers(res.data.data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchMembers(activeWorkspace.id);
    } else {
      setMembers([]);
    }
  }, [activeWorkspace, fetchMembers]);

  const switchWorkspace = (workspaceOrNull) => {
    setActiveWorkspace(workspaceOrNull);
  };

  const createOrganization = async (name, description) => {
    const res = await api.post('/organizations', { name, description });
    if (res.data?.success) {
      await fetchWorkspaces();
      const newOrg = res.data.data.organization;
      setActiveWorkspace(newOrg);
    }
    return res.data;
  };

  const inviteMember = async (email, role) => {
    if (!activeWorkspace?.id) return;
    const res = await api.post(`/organizations/${activeWorkspace.id}/members`, { email, role });
    if (res.data?.success) {
      await fetchMembers(activeWorkspace.id);
    }
    return res.data;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        members,
        loadingWorkspaces,
        switchWorkspace,
        createOrganization,
        inviteMember,
        fetchWorkspaces,
        fetchMembers,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
