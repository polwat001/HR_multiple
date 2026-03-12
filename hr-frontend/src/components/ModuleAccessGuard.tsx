import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessModule, ModuleKey } from "@/lib/accessMatrix";
import { UserRole } from "@/types/roles";

interface ModuleAccessGuardProps {
  moduleKey: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ModuleAccessGuard({ moduleKey, children, fallback = null }: ModuleAccessGuardProps) {
  const { userPermissions } = useAuth();

  if (!userPermissions) {
    return <>{fallback}</>;
  }

  const roles = (userPermissions.roles || []) as UserRole[];
  const allowed = canAccessModule(roles, moduleKey);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
