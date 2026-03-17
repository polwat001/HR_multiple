import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  LayoutDashboard, Users, Building, Clock, CalendarDays,
  FileText, BarChart3, Shield, ChevronLeft, ChevronRight, Briefcase, LogOut, Settings, ClipboardList, CalendarCheck2, User, Phone, GitBranch, Landmark,
} from "lucide-react";
import CompanySwitcher from "@/components/CompanySwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";
import { MODULE_ACCESS_MATRIX, NAV_MODULE_ORDER, ModuleKey, canAccessModule } from "@/lib/accessMatrix";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  moduleKey: ModuleKey;
}

const moduleIconMap: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  selfService: User,
  organization: Building,
  positions: Briefcase,
  employees: Users,
  attendance: Clock,
  leave: CalendarDays,
  contacts: Phone,
  contracts: FileText,
  holidays: CalendarCheck2,
  reports: BarChart3,
  payroll: Landmark,
  approvalFlow: GitBranch,
  permissions: Shield,
  systemSettings: Settings,
  auditLog: ClipboardList,
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, userPermissions, logout: authLogout, hasRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const location = router.pathname;
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isCentralHr = hasRole(UserRole.CENTRAL_HR);
  const canSwitchCompany = isCentralHr || isSuperAdmin;
  const roleLabel = (user as any)?.role || (user as any)?.role_name || t("app.unknownUser");

  const handleLogout = () => {
    if (confirm(t("app.logoutConfirm"))) {
      authLogout();
    }
  };

  const roles = ((userPermissions?.roles || []) as UserRole[]);
  const navItems: NavItem[] = NAV_MODULE_ORDER
    .map((key) => {
      const config = MODULE_ACCESS_MATRIX[key];
      return {
        moduleKey: key,
        icon: moduleIconMap[key],
        label: config.label,
        path: config.path,
      };
    })
    .filter((item) => MODULE_ACCESS_MATRIX[item.moduleKey].showInNav);

  const visibleNavItems = navItems.filter((item) => canAccessModule(roles, item.moduleKey));

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
              {t("app.title")}
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
                {!collapsed && <span className="truncate">{t(`module.${item.moduleKey}`, item.label)}</span>}
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
          {!collapsed && <span className="truncate">{t("app.logout")}</span>}
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
              {t(
                `module.${visibleNavItems.find(i => 
                location === i.path || 
                (i.path !== "/" && location.startsWith(i.path))
              )?.moduleKey || "dashboard"}`,
                t("app.dashboardFallback")
              )}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t("app.language")}</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "th" | "en")}
              >
                <option value="th">{t("app.thai")}</option>
                <option value="en">{t("app.english")}</option>
              </select>
            </div>
            {canSwitchCompany ? (
              <CompanySwitcher />
            ) : (
              <div className="text-xs px-3 py-2 rounded-md border border-border bg-muted/30 text-muted-foreground">
                {isSuperAdmin ? t("app.fullAccess") : t("app.companyScopedAccess")}
              </div>
            )}
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground">{user?.display_name || user?.username || t("app.unknownUser")}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}{user?.position_name ? ` • ${user.position_name}` : ""}</div>
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