"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  Activity,
  FileText,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "课程管理", icon: BookOpen },
  { href: "/dashboard/motions", label: "标准动作库", icon: BarChart3 },
  { href: "/dashboard/assessment", label: "AI 测评", icon: Activity },
  { href: "/dashboard/reports", label: "测评报告", icon: FileText },
  { href: "/dashboard/settings", label: "系统设置", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
};

export function Sidebar({ variant = "desktop" }: { variant?: "desktop" | "sheet" }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user as any)?.role as string | undefined;
  const roleLabel = ROLE_LABELS[role ?? ""] ?? "用户";

  return (
    <aside className={cn(variant === "desktop" ? "hidden md:flex" : "flex", "w-60 flex-col bg-sidebar text-sidebar-foreground")}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-1.5 border-b border-sidebar-border px-6">
        <span className="text-2xl font-extrabold tracking-tight text-primary">
          LZ
        </span>
        <span className="text-lg font-bold tracking-wide text-sidebar-foreground">
          SPORTZ
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {roleLabel.charAt(0)}
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-medium text-sidebar-foreground/80">
              {roleLabel}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">
              {user?.email || ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="shrink-0 rounded-md p-1 text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
            title="退出登录"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
