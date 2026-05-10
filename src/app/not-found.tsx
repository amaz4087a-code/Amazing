import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground">页面不存在</p>
      <Link href="/">
        <Button>返回首页</Button>
      </Link>
    </div>
  );
}
