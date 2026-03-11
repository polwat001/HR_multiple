import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  LayoutDashboard, Users, Building, Clock, CalendarDays,
  FileText, BarChart3, Shield, ChevronLeft, ChevronRight, Briefcase, LogOut, Settings, ClipboardList, CalendarCheck2, User,
} from "lucide-react";
import CompanySwitcher from "@/components/CompanySwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  permissions?: Permission[];
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/dashboard",
    permissions: [Permission.VIEW_OWN_DASHBOARD, Permission.VIEW_COMPANY_DASHBOARD, Permission.VIEW_HOLDING_DASHBOARD]
  },
  {
    icon: User,
    label: "Self-Service",
    path: "/self-service",
    roles: [
      UserRole.EMPLOYEE,
      UserRole.MANAGER,
      UserRole.CENTRAL_HR,
      UserRole.SUPER_ADMIN,
    ],
  },
  { 
    icon: Building, 
    label: "Organization", 
    path: "/organization",
    permissions: [Permission.VIEW_COMPANY_ORGANIZATION, Permission.VIEW_ALL_ORGANIZATION, Permission.MANAGE_ORGANIZATION]
  },
  { 
    icon: Briefcase, 
    label: "Position Master", 
    path: "/positions",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN]
  },
  { 
    icon: Users, 
    label: "Employee", 
    path: "/employees",
    permissions: [Permission.VIEW_OWN_PROFILE, Permission.VIEW_DEPARTMENT_EMPLOYEES, Permission.VIEW_COMPANY_EMPLOYEES, Permission.VIEW_ALL_EMPLOYEES]
  },
  { 
    icon: Clock, 
    label: "Time & Attendance", 
    path: "/attendance",
    permissions: [Permission.VIEW_OWN_ATTENDANCE, Permission.VIEW_DEPARTMENT_ATTENDANCE, Permission.VIEW_COMPANY_ATTENDANCE, Permission.MANAGE_ATTENDANCE]
  },
  { 
    icon: CalendarDays, 
    label: "Leave", 
    path: "/leave",
    permissions: [Permission.REQUEST_LEAVE, Permission.APPROVE_DEPARTMENT_LEAVE, Permission.MANAGE_COMPANY_LEAVE, Permission.MANAGE_ALL_LEAVE]
  },
  { 
    icon: FileText, 
    label: "Contract", 
    path: "/contracts",
    permissions: [Permission.VIEW_COMPANY_CONTRACTS, Permission.MANAGE_COMPANY_CONTRACTS, Permission.MANAGE_CONTRACT_TEMPLATES]
  },
  {
    icon: CalendarCheck2,
    label: "Holiday",
    path: "/holidays",
    permissions: [Permission.VIEW_HOLIDAYS, Permission.MANAGE_COMPANY_HOLIDAYS, Permission.MANAGE_ALL_HOLIDAYS],
  },
  { 
    icon: BarChart3, 
    label: "Reports", 
    path: "/reports",
    permissions: [Permission.VIEW_DEPARTMENT_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_CONSOLIDATED_REPORTS]
  },
  { 
    icon: Shield, 
    label: "User & Permission", 
    path: "/permissions",
    roles: [UserRole.SUPER_ADMIN]
  },
  {
    icon: Settings,
    label: "System Settings",
    path: "/system-settings",
    permissions: [Permission.MANAGE_SYSTEM_SETTINGS],
  },
  {
    icon: ClipboardList,
    label: "Audit Logs",
    path: "/audit-log",
    permissions: [Permission.VIEW_AUDIT_LOGS],
  },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout: authLogout, hasAnyPermission, hasRole } = useAuth();
  const router = useRouter();
  const location = router.pathname;
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isCentralHr = hasRole(UserRole.CENTRAL_HR);
  const canSwitchCompany = isCentralHr;

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
      authLogout();
    }
  };

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter((item) => {
    if (isSuperAdmin) {
      return ["/organization", "/permissions", "/system-settings", "/audit-log"].includes(item.path);
    }

    if (item.roles && item.roles.length > 0) {
      return item.roles.some((role) => hasRole(role));
    }
    if (item.permissions && item.permissions.length > 0) {
      return hasAnyPermission(item.permissions);
    }
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "gradient-sidebar flex flex-col transition-all duration-300 relative z-10",
          collapsed ? "w-[68px]" : "w-[250px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            HR
          </div>
          {!collapsed && (
            <span className="text-white font-semibold text-sm truncate">
              HR Core System
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location === item.path || 
              (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors-300",
                  isActive
                    ? "bg-white/15 text-white font-medium "
                    : "text-white hover:bg-white/10"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors-300 text-white hover:bg-white/10 mx-2 mb-4 w-[calc(100%-1rem)]",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-card hover:shadow-card-hover transition-shadow"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {visibleNavItems.find(i => 
                location === i.path || 
                (i.path !== "/" && location.startsWith(i.path))
              )?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {canSwitchCompany ? (
              <CompanySwitcher />
            ) : (
              <div className="text-xs px-3 py-2 rounded-md border border-border bg-muted/30 text-muted-foreground">
                {isSuperAdmin ? "Full Access" : "Company Scoped Access"}
              </div>
            )}
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground">{user?.display_name || user?.username || "User"}</div>
                <div className="text-xs text-muted-foreground">{user?.position_name || user?.role || "Employee"}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;