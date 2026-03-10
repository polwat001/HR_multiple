"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserPermissions, UserRole, Permission } from "@/types/roles";
import { calculatePermissions, hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permissions";
import { apiGet } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  userPermissions: UserPermissions | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUserData = localStorage.getItem("userData");

        if (token && storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setIsAuthenticated(true);

            // Fetch full user data with roles from API
            try {
              const meResponse = await apiGet<any>("/auth/me");
              const fullUserData: User = meResponse?.user || meResponse;
              setUser({
                ...fullUserData,
                role: fullUserData.role || (fullUserData as any).role_name,
              });

              // Calculate permissions based on roles
              const userRoles: UserRole[] = ((fullUserData as any).roles || [fullUserData.role || (fullUserData as any).role_name]) as UserRole[];
              const permissions = calculatePermissions(userRoles);

              setUserPermissions({
                roles: userRoles,
                permissions: permissions,
                companyId: fullUserData.company_id,
                departmentId: fullUserData.department_id,
              });
            } catch (error) {
              console.warn("Failed to fetch full user data:", error);
              // Fall back to stored user data
              const roles: UserRole[] = (userData.roles || [userData.role]) as UserRole[];
              const permissions = calculatePermissions(roles);

              setUserPermissions({
                roles,
                permissions,
                companyId: userData.company_id,
                departmentId: userData.department_id,
              });
            }
          } catch (err) {
            console.error("Failed to parse user data:", err);
            setIsAuthenticated(false);
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const checkPermission = (permission: Permission): boolean => {
    if (!userPermissions) return false;
    return hasPermission(userPermissions.permissions, permission);
  };

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return hasAnyPermission(userPermissions.permissions, permissions);
  };

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return hasAllPermissions(userPermissions.permissions, permissions);
  };

  const checkRole = (role: UserRole): boolean => {
    if (!userPermissions) return false;
    return userPermissions.roles.includes(role);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    setUser(null);
    setUserPermissions(null);
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    user,
    userPermissions,
    loading,
    isAuthenticated,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    hasRole: checkRole,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
