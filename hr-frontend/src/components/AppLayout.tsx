import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Building, Clock, CalendarDays,
  FileText, BarChart3, Shield, ChevronLeft, ChevronRight, Briefcase,
} from "lucide-react";
import CompanySwitcher from "@/components/CompanySwitcher";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building, label: "Organization", path: "/organization" },
  { icon: Briefcase, label: "Position Master", path: "/positions" },
  { icon: Users, label: "Employee", path: "/employees" },
  { icon: Clock, label: "Time & Attendance", path: "/attendance" },
  { icon: CalendarDays, label: "Leave", path: "/leave" },
  { icon: FileText, label: "Contract", path: "/contracts" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Shield, label: "User & Permission", path: "/permissions" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm  transition-colors-300",
                  isActive
                    ? "bg-white/15 text-white font-medium "
                    : "text-white "
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

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
              {navItems.find(i => 
                location.pathname === i.path || 
                (i.path !== "/" && location.pathname.startsWith(i.path))
              )?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <CompanySwitcher />
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                SC
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground">สมชาย ว.</div>
                <div className="text-xs text-muted-foreground">HR Director</div>
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