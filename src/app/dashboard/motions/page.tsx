import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload } from "lucide-react";

export default async function MotionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const canUpload = role === "ADMIN" || role === "TEACHER";

  const motions = await prisma.standardMotion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">标准动作库</h1>
          <p className="text-muted-foreground">
            浏览和管理标准动作数据
          </p>
        </div>
        {canUpload && (
          <Link href="/dashboard/motions/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              上传动作
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {motions.map((motion) => (
          <Link key={motion.id} href={`/dashboard/motions/${motion.id}`}>
            <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-lg">{motion.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {motion.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{motion.category}</Badge>
                  <Badge variant="outline">{motion.difficulty}</Badge>
                  <Badge variant="outline">{motion.frameCount} 帧</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
