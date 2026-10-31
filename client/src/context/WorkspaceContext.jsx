import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // null = Personal Space, or { id, name, slug, role } = Team Organization
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingRemovalRequests, setPendingRemovalRequests] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [isUnauthorizedWorkspace, setIsUnauthorizedWorkspace] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsUnauthorizedWorkspace(false);
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

  const fetchPendingRemovalRequests = useCallback(async (orgId) => {
    if (!orgId) {
      setPendingRemovalRequests([]);
      return;
    }
    try {
      const res = await api.get(`/organizations/${orgId}/member-removal-requests`);
      if (res.data?.success) {
        setPendingRemovalRequests(res.data.data.requests || []);
      }
    } catch {
      setPendingRemovalRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Synchronize active workspace strictly with browser URL (URL as single source of truth)
  useEffect(() => {
    if (!user) {
      setActiveWorkspace(null);
      setIsUnauthorizedWorkspace(false);
      return;
    }

    const pathname = location.pathname;

    if (pathname === '/personal') {
      setActiveWorkspace(null);
      setIsUnauthorizedWorkspace(false);
      return;
    }

    if (pathname.startsWith('/teams/')) {
      const targetOrgId = pathname.replace('/teams/', '').split('/')[0];
      if (!targetOrgId) {
        setActiveWorkspace(null);
        setIsUnauthorizedWorkspace(false);
        return;
      }

      // Wait until workspaces finish loading before declaring unauthorized
      if (loadingWorkspaces) {
        return;
      }

      const match = workspaces.find((w) => String(w.id || w._id) === String(targetOrgId));
      if (match) {
        const normalized = {
          ...match,
          id: match.id || match._id,
        };
        setIsUnauthorizedWorkspace(false);
        setActiveWorkspace((prev) => {
          if (prev && String(prev.id || prev._id) === String(normalized.id)) {
            return prev;
          }
          return normalized;
        });
      } else {
        // User is not a member of this organization or it does not exist
        setActiveWorkspace(null);
        setIsUnauthorizedWorkspace(true);
      }
    } else {
      setIsUnauthorizedWorkspace(false);
    }
  }, [location.pathname, workspaces, loadingWorkspaces, user]);

  // Fetch members & pending removal requests whenever active workspace changes
  useEffect(() => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (orgId) {
      fetchMembers(orgId);
      if (['owner', 'manager'].includes(activeWorkspace?.role?.toLowerCase?.())) {
        fetchPendingRemovalRequests(orgId);
      } else {
        setPendingRemovalRequests([]);
      }
    } else {
      setMembers([]);
      setPendingRemovalRequests([]);
    }
  }, [activeWorkspace, fetchMembers, fetchPendingRemovalRequests]);

  // Navigate using React Router on workspace switch
  const switchWorkspace = useCallback(
    (workspaceOrNull) => {
      if (!workspaceOrNull) {
        navigate('/personal');
      } else {
        const orgId = workspaceOrNull.id || workspaceOrNull._id;
        navigate(`/teams/${orgId}`);
      }
    },
    [navigate]
  );

  const createOrganization = async (name, description) => {
    const res = await api.post('/organizations', { name, description });
    if (res.data?.success) {
      await fetchWorkspaces();
      const newOrg = res.data.data.organization;
      const orgId = newOrg.id || newOrg._id;
      navigate(`/teams/${orgId}`);
    }
    return res.data;
  };

  const inviteMember = async (email, role) => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (!orgId) return;
    const res = await api.post(`/organizations/${orgId}/members`, { email, role });
    if (res.data?.success) {
      await fetchMembers(orgId);
    }
    return res.data;
  };

  const removeMemberDirect = async (memberId) => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (!orgId) return;
    const res = await api.delete(`/organizations/${orgId}/members/${memberId}`);
    if (res.data?.success) {
      await fetchMembers(orgId);
      await fetchPendingRemovalRequests(orgId);
    }
    return res.data;
  };

  const requestMemberRemoval = async (memberId) => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (!orgId) return;
    const res = await api.post(`/organizations/${orgId}/members/${memberId}/removal-request`);
    if (res.data?.success) {
      await fetchMembers(orgId);
      await fetchPendingRemovalRequests(orgId);
    }
    return res.data;
  };

  const approveMemberRemoval = async (memberId, requestId) => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (!orgId) return;
    const res = await api.post(`/organizations/${orgId}/members/${memberId}/removal-request/${requestId}/approve`);
    if (res.data?.success) {
      await fetchMembers(orgId);
      await fetchPendingRemovalRequests(orgId);
    }
    return res.data;
  };

  const rejectMemberRemoval = async (memberId, requestId) => {
    const orgId = activeWorkspace?.id || activeWorkspace?._id;
    if (!orgId) return;
    const res = await api.post(`/organizations/${orgId}/members/${memberId}/removal-request/${requestId}/reject`);
    if (res.data?.success) {
      await fetchMembers(orgId);
      await fetchPendingRemovalRequests(orgId);
    }
    return res.data;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        members,
        pendingRemovalRequests,
        loadingWorkspaces,
        isUnauthorizedWorkspace,
        switchWorkspace,
        createOrganization,
        inviteMember,
        removeMemberDirect,
        requestMemberRemoval,
        approveMemberRemoval,
        rejectMemberRemoval,
        fetchWorkspaces,
        fetchMembers,
        fetchPendingRemovalRequests,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);

