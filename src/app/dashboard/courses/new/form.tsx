"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ImagePlus, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "GENERAL", label: "通用" },
  { value: "DANCE", label: "舞蹈" },
  { value: "SPORTS", label: "体育" },
  { value: "REHABILITATION", label: "康复" },
];

const NAME_MAX = 100;
const DESC_MAX = 500;

export function NewCourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("图片不能超过 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setThumbnail(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearThumbnail() {
    setThumbnail(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("请输入课程名称");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, thumbnail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "创建失败");
      }

      toast.success("课程创建成功");
      router.push(`/dashboard/courses/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/courses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">新建课程</h1>
          <p className="text-muted-foreground">创建新的课程并关联标准动作</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {/* Thumbnail */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>课程封面</CardTitle>
          </CardHeader>
          <CardContent>
            {thumbnail ? (
              <div className="relative inline-block">
                <img
                  src={thumbnail}
                  alt="封面预览"
                  className="h-40 w-72 rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={clearThumbnail}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:bg-muted/50"
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">点击上传课程封面</p>
                <p className="text-xs text-muted-foreground">
                  支持 JPG / PNG / WebP，最大 500KB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleThumbnailSelect}
            />
          </CardContent>
        </Card>

        {/* Basic info */}
        <Card className="border-l-4 border-l-blue-400">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">
                课程名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="例如：篮球基础训练"
                required
              />
              <p className="text-xs text-muted-foreground text-right">{name.length}/{NAME_MAX}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">课程描述</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="描述课程的目标和内容..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/{DESC_MAX}</p>
            </div>
          </CardContent>
        </Card>

        {/* Category */}
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader>
            <CardTitle>分类设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="category">课程分类</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "创建中..." : "创建课程"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/dashboard/courses")}
          >
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
