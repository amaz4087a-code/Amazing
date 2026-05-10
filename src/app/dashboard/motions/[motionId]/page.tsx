import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MotionDetailClient } from "./client";

export default async function MotionDetailPage({
  params,
}: {
  params: Promise<{ motionId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { motionId } = await params;
  const motion = await prisma.standardMotion.findUnique({
    where: { id: motionId },
  });

  if (!motion) notFound();

  const tags = JSON.parse(motion.tags || "[]") as string[];

  const frames = await prisma.standardMotionFrame.findMany({
    where: { standardMotionId: motionId },
    orderBy: { frameIndex: "asc" },
    take: 300,
  });

  const parsedFrames = frames.map((f) => ({
    frameIndex: f.frameIndex,
    timestamp: f.timestamp,
    joints: JSON.parse(f.joints as string),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/motions">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回动作库
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{motion.name}</h1>
        <p className="text-muted-foreground">{motion.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">时长</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{motion.duration}s</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">帧数</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{motion.frameCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">FPS</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{motion.fps}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">关节数</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{motion.jointsCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>3D 预览</CardTitle>
            <div className="flex gap-2">
              <Badge>{motion.category}</Badge>
              <Badge variant="secondary">{motion.difficulty}</Badge>
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MotionDetailClient frames={parsedFrames} fps={motion.fps} />
        </CardContent>
      </Card>
    </div>
  );
}
