"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileJson, FileSpreadsheet, ArrowLeft } from "lucide-react";

export default function MotionUploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (role && role !== "ADMIN" && role !== "TEACHER") {
      router.replace("/dashboard/motions");
    } else if (role) {
      setAuthorized(true);
    }
  }, [role, router]);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("DANCE");
  const [difficulty, setDifficulty] = useState("BEGINNER");
  const [tags, setTags] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error("请选择一个文件");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || file.name.replace(/\.[^/.]+$/, ""));
    formData.append("description", description);
    formData.append("category", category);
    formData.append("difficulty", difficulty);
    formData.append("tags", tags);

    try {
      const res = await fetch("/api/motions/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "上传失败");
      }

      const data = await res.json();
      toast.success(`"${data.name}" 上传成功！共 ${data.frameCount} 帧`);
      router.push(`/dashboard/motions/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/motions">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回动作库
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">上传标准动作</h1>
        <p className="text-muted-foreground">
          支持 JSON / CSV 格式的动作捕捉数据文件
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload zone */}
        <Card>
          <CardHeader><CardTitle>动作文件</CardTitle></CardHeader>
          <CardContent>
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-input")?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:bg-muted/50"
            >
              {file ? (
                <>
                  {file.name.endsWith(".json") ? (
                    <FileJson className="h-8 w-8 text-primary" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  )}
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    重新选择
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">拖拽文件到此处</p>
                  <p className="text-sm text-muted-foreground">
                    或点击选择文件（JSON / CSV）
                  </p>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader><CardTitle>动作信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="动作名称（默认使用文件名）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="动作描述（可选）"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="DANCE">舞蹈</option>
                  <option value="SPORTS">运动</option>
                  <option value="REHABILITATION">康复</option>
                  <option value="GENERAL">通用</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">难度</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="BEGINNER">入门</option>
                  <option value="INTERMEDIATE">中级</option>
                  <option value="ADVANCED">高级</option>
                  <option value="EXPERT">专家</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如: 基础, 手臂, 入门"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={uploading || !file}>
          {uploading ? "上传中..." : "上传动作"}
        </Button>
      </form>
    </div>
  );
}
