"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Search, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";


interface MotionItem {
  id: string;
  name: string;
  category: string;
  difficulty: string;
}

interface MotionManagerProps {
  courseId: string;
  initialMotions: MotionItem[];
}

export function MotionManager({ courseId, initialMotions }: MotionManagerProps) {
  const [open, setOpen] = useState(false);
  const [associated, setAssociated] = useState<MotionItem[]>(initialMotions);
  const [available, setAvailable] = useState<MotionItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAvailable = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/motions`);
      if (res.ok) {
        const data = await res.json();
        setAvailable(data);
      }
    } catch {
      // silent
    }
  }, [courseId]);

  useEffect(() => {
    if (open) {
      fetchAvailable();
    }
  }, [open, fetchAvailable]);

  async function handleAdd(motionId: string) {
    setActionLoading(motionId);
    try {
      const res = await fetch(`/api/courses/${courseId}/motions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motionIds: [motionId] }),
      });
      if (!res.ok) throw new Error("关联失败");
      const motion = available.find((m) => m.id === motionId);
      if (motion) {
        setAssociated((prev) => [...prev, motion]);
        setAvailable((prev) => prev.filter((m) => m.id !== motionId));
      }
      toast.success("已关联动作");
    } catch {
      toast.error("关联失败");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(motionId: string) {
    setActionLoading(motionId);
    try {
      const res = await fetch(`/api/courses/${courseId}/motions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motionIds: [motionId] }),
      });
      if (!res.ok) throw new Error("取消关联失败");
      const motion = associated.find((m) => m.id === motionId);
      if (motion) {
        setAssociated((prev) => prev.filter((m) => m.id !== motionId));
        setAvailable((prev) => [...prev, motion]);
      }
      toast.success("已取消关联");
    } catch {
      toast.error("取消关联失败");
    } finally {
      setActionLoading(null);
    }
  }

  const filteredAvailable = available.filter(
    (m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
        管理动作
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>管理标准动作</SheetTitle>
          <SheetDescription>添加或移除课程关联的标准动作</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {/* Associated motions */}
          <div className="mb-6">
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              已关联 ({associated.length})
            </h4>
            {associated.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无关联的动作</p>
            ) : (
              <div className="space-y-2">
                {associated.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {m.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {m.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(m.id)}
                      disabled={actionLoading === m.id}
                      className="shrink-0 ml-2"
                    >
                      {actionLoading === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search and available */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              可添加
            </h4>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索动作..."
                className="pl-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {search ? "未找到匹配动作" : "没有可添加的动作"}
                </p>
              ) : (
                filteredAvailable.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {m.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {m.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleAdd(m.id)}
                      disabled={actionLoading === m.id}
                      className="shrink-0 ml-2"
                    >
                      {actionLoading === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
