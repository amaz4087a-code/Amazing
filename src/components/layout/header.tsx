"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Menu, LogOut, User } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理员",
  TEACHER: "教师",
  STUDENT: "学生",
};

export function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const role = (user as any)?.role as string | undefined;
  const roleLabel = ROLE_LABELS[role ?? ""] ?? "用户";
  const fallback = roleLabel.charAt(0);

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card/80 px-6 shadow-xs backdrop-blur-sm">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger className="inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground md:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar variant="sheet" />
        </SheetContent>
      </Sheet>

      {/* Mobile logo */}
      <div className="flex items-center gap-1.5 md:hidden">
        <span className="text-xl font-extrabold tracking-tight text-primary">
          LZ
        </span>
        <span className="text-base font-bold tracking-wide">SPORTZ</span>
      </div>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger className="relative inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {fallback}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{roleLabel}</p>
              <p className="text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <User className="mr-2 h-4 w-4" />
            个人设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
